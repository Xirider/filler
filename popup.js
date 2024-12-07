document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const userDataInput = document.getElementById('userData');
  const saveButton = document.getElementById('save');
  const fillButton = document.getElementById('fill');
  const statusEl = document.getElementById('status');
  let isLoading = false;
  let actualApiKey = ''; // Store the actual API key

  // Load saved settings
  chrome.storage.local.get(['openai_api_key', 'user_data'], (result) => {
    if (result.openai_api_key) {
      actualApiKey = result.openai_api_key;
      apiKeyInput.value = '*'.repeat(result.openai_api_key.length);
    }
    if (result.user_data) {
      userDataInput.value = result.user_data;
    }
  });

  // Handle API key input changes
  apiKeyInput.addEventListener('focus', () => {
    apiKeyInput.value = actualApiKey;
  });

  apiKeyInput.addEventListener('blur', () => {
    if (apiKeyInput.value.trim()) {
      actualApiKey = apiKeyInput.value.trim();
      apiKeyInput.value = '*'.repeat(actualApiKey.length);
    }
  });

  const setLoading = (isLoading) => {
    const inputs = document.querySelectorAll('.input-group');
    inputs.forEach(input => {
      input.classList.toggle('loading', isLoading);
    });
    saveButton.disabled = isLoading;
    fillButton.disabled = isLoading;
  };

  saveButton.addEventListener('click', async () => {
    if (isLoading) return;
    
    isLoading = true;
    setLoading(true);
    
    const apiKey = actualApiKey;
    const userData = userDataInput.value.trim();
    
    try {
      await new Promise((resolve) => {
        chrome.storage.local.set({ openai_api_key: apiKey, user_data: userData }, resolve);
      });
      statusEl.textContent = 'Settings saved!';
    } catch (error) {
      statusEl.textContent = 'Error saving settings';
    } finally {
      isLoading = false;
      setLoading(false);
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    }
  });

  fillButton.addEventListener('click', () => {
    if (isLoading) return;

    isLoading = true;
    setLoading(true);
    statusEl.textContent = 'Filling fields...';

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'fillFields'}, (response) => {
        isLoading = false;
        setLoading(false);
        
        if (chrome.runtime.lastError) {
          statusEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else {
          statusEl.textContent = response && response.status ? response.status : 'Done!';
        }
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      });
    });
  });
}); 
