// contentScript.js: Scans the page for form fields, sends them for completion, and fills them.

// Wait for DOM to be ready
function initFormFiller() {
  // Add styles for the fill dot
  if (!document.getElementById('form-filler-styles')) {
    const style = document.createElement('style');
    style.id = 'form-filler-styles';
    style.textContent = `
      .form-filler-dot {
        position: absolute;
        width: 12px;
        height: 12px;
        background-color: #6366f1;
        border-radius: 50%;
        cursor: pointer;
        opacity: 0.8;
        transition: transform 0.2s ease-out;
        z-index: 10000;
        right: 8px;
        top: 0;
        bottom: 0;
        margin: auto;
        pointer-events: auto;
      }
      .form-filler-dot:hover {
        opacity: 1;
        transform: scale(1.1);
      }
      .form-filler-dot.loading {
        background-color: transparent;
        border: 2px solid #e2e8f0;
        border-top-color: #6366f1;
        animation: form-filler-spin 0.8s linear infinite;
        box-sizing: border-box;
      }
      @keyframes form-filler-spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      .form-filler-field-wrapper {
        position: relative !important;
        display: block !important;
        width: 100% !important;
        height: 100% !important;
      }
      .form-filler-field-wrapper input,
      .form-filler-field-wrapper textarea,
      .form-filler-field-wrapper select {
        width: 100% !important;
        box-sizing: border-box !important;
        padding-right: 28px !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Function to create and position a dot
  function createFillDot(field) {
    if (!field.isConnected) return null;

    // Add wrapper class to the field's parent if needed
    const existingWrapper = field.parentElement.classList.contains('form-filler-field-wrapper');
    if (!existingWrapper) {
      field.parentElement.classList.add('form-filler-field-wrapper');
    }

    // Remove any existing dots
    const existingDot = field.parentElement.querySelector('.form-filler-dot');
    if (existingDot) {
      existingDot.remove();
    }

    const dot = document.createElement('div');
    dot.className = 'form-filler-dot';
    field.parentElement.appendChild(dot);

    // Add click handler
    dot.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!field.isConnected) {
        dot.remove();
        return;
      }

      dot.classList.add('loading');

      // Get all form fields info
      const fieldsInfo = [];
      document.querySelectorAll('input, textarea, select').forEach((field, index) => {
        if (!field.isConnected || 
            field.type === 'hidden' || 
            field.disabled ||
            field.type === 'password' || 
            field.type === 'search' ||
            field.type === 'submit' ||
            field.type === 'button' ||
            field.name?.toLowerCase().includes('search') ||
            field.id?.toLowerCase().includes('search') ||
            field.placeholder?.toLowerCase().includes('search')) {
          return;
        }

        const labels = [];
        if (field.id) {
          const associatedLabel = document.querySelector(`label[for="${field.id}"]`);
          if (associatedLabel) {
            labels.push(associatedLabel.innerText.trim());
          }
        }

        let parentLabel = field.closest('label');
        if (parentLabel) {
          labels.push(parentLabel.innerText.trim());
        }

        if (field.getAttribute('aria-labelledby')) {
          const labelIds = field.getAttribute('aria-labelledby').split(' ');
          labelIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) labels.push(element.innerText.trim());
          });
        }

        // For select fields, get options
        const options = field.tagName.toLowerCase() === 'select' 
          ? Array.from(field.options).map(opt => opt.text.trim())
          : [];

        const fieldInfo = {
          index: index + 1,
          type: field.tagName.toLowerCase() === 'select' ? 'select' : (field.type || 'text'),
          name: field.name || '',
          id: field.id || '',
          placeholder: field.placeholder || '',
          ariaLabel: field.getAttribute('aria-label') || '',
          labels: labels.filter(l => l),
          required: field.required,
          pattern: field.pattern,
          minLength: field.minLength,
          maxLength: field.maxLength,
          validationMessage: field.validationMessage,
          options,
          className: field.className,
          autocomplete: field.getAttribute('autocomplete') || ''
        };

        fieldsInfo.push(fieldInfo);
      });

      const pageContext = {
        title: document.title,
        url: window.location.href,
        metaDescription: document.querySelector('meta[name="description"]')?.content || '',
        h1: Array.from(document.getElementsByTagName('h1')).map(h => h.innerText).join(' '),
      };

      // Send message to background to get completion for all fields
      chrome.runtime.sendMessage({
        action: 'getCompletion',
        fieldsInfo,
        pageContext
      }, (response) => {
        dot.classList.remove('loading');
        
        if (response && response.fields) {
          // Fill all fields
          fieldsInfo.forEach((info, index) => {
            const fieldToFill = document.querySelector(`#${info.id}`) || 
                              document.querySelector(`[name="${info.name}"]`) ||
                              document.querySelectorAll('input, textarea')[info.index - 1];
            
            if (fieldToFill && response.fields[(index + 1).toString()]) {
              fieldToFill.value = response.fields[(index + 1).toString()];
              fieldToFill.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        }
      });
    });

    return dot;
  }

  // Add dots to all appropriate input fields
  function addDotsToFields() {
    try {
      // Find all input fields
      document.querySelectorAll('input, textarea').forEach(field => {
        try {
          // Skip if field is not visible, or is password/search
          if (!field.isConnected || 
              field.type === 'hidden' || 
              field.disabled ||
              field.type === 'password' || 
              field.type === 'search' ||
              field.type === 'submit' ||
              field.type === 'button' ||
              field.name?.toLowerCase().includes('search') ||
              field.id?.toLowerCase().includes('search') ||
              field.placeholder?.toLowerCase().includes('search')) {
            return;
          }

          createFillDot(field);
        } catch (err) {
          console.error('Error processing field:', err);
        }
      });

      // Add wrapper to select elements without dots
      document.querySelectorAll('select').forEach(field => {
        try {
          if (!field.isConnected || field.disabled) {
            return;
          }
          if (!field.parentElement.classList.contains('form-filler-field-wrapper')) {
            field.parentElement.classList.add('form-filler-field-wrapper');
          }
        } catch (err) {
          console.error('Error processing select field:', err);
        }
      });
    } catch (err) {
      console.error('Error in addDotsToFields:', err);
    }
  }

  // Add dots when the page is fully loaded
  if (document.readyState === 'complete') {
    addDotsToFields();
  } else {
    window.addEventListener('load', addDotsToFields);
  }
}

// Initialize the form filler
if (document.readyState !== 'loading') {
  initFormFiller();
} else {
  document.addEventListener('DOMContentLoaded', initFormFiller);
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

      // Skip password fields and search-related fields
      if (field.type === 'password' || 
          field.type === 'search' ||
          field.name?.toLowerCase().includes('search') ||
          field.id?.toLowerCase().includes('search') ||
          field.placeholder?.toLowerCase().includes('search')) {
        console.log('Content: Skipping sensitive/search field', { type: field.type, id: field.id });
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
      console.log('Content: No fields found');
      sendResponse({status: "No fields found on this page."});
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
              console.log('Content: Handling select field', {
                options: field.options.length,
                valueToFill
              });
            } else {
              field.value = valueToFill;
              field.dispatchEvent(new Event('input', {bubbles: true}));
              console.log('Content: Field filled', {
                field: field,
                value: valueToFill
              });
            }
          } else {
            console.error('Content: Could not find field for info', info);
          }
        }
        sendResponse({status: "Fields filled successfully!"});
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

// Add logging to helper function
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