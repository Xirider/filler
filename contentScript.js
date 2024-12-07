// contentScript.js: Scans the page for form fields, sends them for completion, and fills them.

// Add styles for the glow effect
const style = document.createElement('style');
style.textContent = `
  .form-field-glow {
    transition: box-shadow 0.2s ease-in-out;
    box-shadow: 0 0 8px rgba(0, 123, 255, 0.6) !important;
  }
`;
document.head.appendChild(style);

// Function to apply glow effect
function applyGlowEffect(element) {
  element.classList.add('form-field-glow');
  setTimeout(() => {
    element.classList.remove('form-field-glow');
  }, 200);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillFields') {
    console.log('Content: Received fillFields request');
    
    // Identify all form fields
    const formFields = document.querySelectorAll('input, select, textarea');
    console.log('Content: Found form fields', formFields.length);
    
    const fieldsInfo = [];
    let index = 0;

    formFields.forEach(field => {
      if (!field.isConnected || field.type === 'hidden' || field.disabled) {
        console.log('Content: Skipping field', { type: field.type, id: field.id });
        return;
      }

      // Skip password fields, search-related fields, and already filled fields
      if (field.type === 'password' || 
          field.type === 'search' ||
          field.name?.toLowerCase().includes('search') ||
          field.id?.toLowerCase().includes('search') ||
          field.placeholder?.toLowerCase().includes('search') ||
          (field.value && field.value.trim() !== '')) { // Skip if field already has a value
        console.log('Content: Skipping sensitive/search/filled field', { type: field.type, id: field.id });
        return;
      }

      index++;

      const labels = [];
      
      // 1) Check for explicit label with 'for' attribute
      if (field.id) {
        const associatedLabel = document.querySelector(`label[for="${field.id}"]`);
        if (associatedLabel) {
          labels.push(associatedLabel.innerText.trim());
        }
      }

      // 2) Check for parent label elements
      let parentLabel = field.closest('label');
      if (parentLabel) {
        labels.push(parentLabel.innerText.trim());
      }

      // 3) Check for aria-labelledby
      if (field.getAttribute('aria-labelledby')) {
        const labelIds = field.getAttribute('aria-labelledby').split(' ');
        labelIds.forEach(id => {
          const element = document.getElementById(id);
          if (element) labels.push(element.innerText.trim());
        });
      }

      // 4) Look for preceding text or headers
      const previousElement = field.previousElementSibling;
      if (previousElement && (previousElement.tagName === 'SPAN' || previousElement.tagName === 'DIV' || previousElement.tagName.startsWith('H'))) {
        labels.push(previousElement.innerText.trim());
      }

      // 5) Check for field groups (fieldset/legend)
      const fieldset = field.closest('fieldset');
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend) labels.push(legend.innerText.trim());
      }

      // Get any validation or pattern requirements
      const required = field.required;
      const pattern = field.pattern;
      const minLength = field.minLength;
      const maxLength = field.maxLength;
      const validationMessage = field.validationMessage;

      // For select fields, get options
      const options = field.tagName.toLowerCase() === 'select' 
        ? Array.from(field.options).map(opt => opt.text.trim())
        : [];

      const fieldInfo = {
        index,
        type: field.tagName.toLowerCase() === 'select' ? 'select' : (field.type || 'text'),
        name: field.name || '',
        id: field.id || '',
        placeholder: field.placeholder || '',
        ariaLabel: field.getAttribute('aria-label') || '',
        labels: labels.filter(l => l),
        required,
        pattern,
        minLength,
        maxLength,
        validationMessage,
        options,
        className: field.className,
        autocomplete: field.getAttribute('autocomplete') || ''
      };

      console.log('Content: Processing field', fieldInfo);
      fieldsInfo.push(fieldInfo);
    });

    if (fieldsInfo.length === 0) {
      console.log('Content: No empty fields found');
      sendResponse({status: "No empty fields found on this page."});
      return;
    }

    console.log('Content: Sending getCompletion request', fieldsInfo);
    
    // Gather page context
    const pageContext = {
      title: document.title,
      url: window.location.href,
      metaDescription: document.querySelector('meta[name="description"]')?.content || '',
      h1: Array.from(document.getElementsByTagName('h1')).map(h => h.innerText).join(' '),
    };

    // Send message to background to get completion
    chrome.runtime.sendMessage({
      action: 'getCompletion', 
      fieldsInfo,
      pageContext
    }, (response) => {
      console.log('Content: Received completion response', response);
      
      if (response && response.fields) {
        // Now we populate the fields
        for (let i = 0; i < fieldsInfo.length; i++) {
          const info = fieldsInfo[i];
          const valueToFill = response.fields[(i+1).toString()] || '';
          console.log('Content: Attempting to fill field', { info, valueToFill });

          const field = findFieldByInfo(info);
          if (field) {
            console.log('Content: Found field to fill', { 
              element: field,
              tagName: field.tagName,
              type: field.type
            });

            if (field.tagName.toLowerCase() === 'select') {
              // For select: try to match option text
              let matched = false;
              for (let opt of field.options) {
                if (opt.text.toLowerCase().includes(valueToFill.toLowerCase()) || opt.value.toLowerCase() === valueToFill.toLowerCase()) {
                  opt.selected = true;
                  matched = true;
                  break;
                }
              }
              if (!matched && field.options.length > 0) {
                // If not matched, just pick the first option if not empty
                field.selectedIndex = 0;
              }
              field.dispatchEvent(new Event('change', {bubbles: true}));
              applyGlowEffect(field);
              console.log('Content: Handling select field', {
                options: field.options.length,
                valueToFill
              });
            } else {
              field.value = valueToFill;
              field.dispatchEvent(new Event('input', {bubbles: true}));
              applyGlowEffect(field);
              console.log('Content: Field filled', {
                field: field,
                value: valueToFill
              });
            }
          } else {
            console.error('Content: Could not find field for info', info);
          }
        }
        sendResponse({status: "Empty fields filled successfully!"});
      } else if (response && response.error) {
        console.error('Content: Error response received', response.error);
        sendResponse({status: "Error: " + response.error});
      } else {
        console.error('Content: No valid response received');
        sendResponse({status: "No response from API."});
      }
    });

    return true;
  }
});

// Helper function to find field by info
function findFieldByInfo(info) {
  console.log('Content: Finding field by info', info);
  
  let selector = null;
  if (info.id) {
    selector = `#${CSS.escape(info.id)}`;
  } else if (info.name) {
    selector = `[name="${CSS.escape(info.name)}"]`;
  }

  if (selector) {
    const found = document.querySelector(selector);
    console.log('Content: Field search by selector', { 
      selector, 
      found: !!found 
    });
    if (found) return found;
  }

  // Fallback search
  console.log('Content: Using fallback field search');
  const allFields = document.querySelectorAll('input, select, textarea');
  console.log('Content: All fields found', allFields.length);
  
  const filtered = Array.from(allFields).filter(el => {
    if (el.type === 'hidden' || el.disabled) return false;
    // match attributes
    if (info.id && el.id === info.id) return true;
    if (info.name && el.name === info.name) return true;
    if (info.placeholder && el.placeholder === info.placeholder) return true;
    return false;
  });

  console.log('Content: Filtered fields', {
    filtered: filtered.length,
    index: info.index
  });

  if (filtered.length === 1) return filtered[0];
  
  // Last resort: return by index
  const byIndex = document.querySelectorAll('input, select, textarea')[info.index - 1];
  console.log('Content: Falling back to index-based field', {
    found: !!byIndex,
    index: info.index - 1
  });
  
  return byIndex || null;
} 