document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const userDataInput = document.getElementById('userData');
  const saveButton = document.getElementById('save');
  const fillButton = document.getElementById('fill');
  const statusEl = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(['openai_api_key', 'user_data'], (result) => {
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
    }
    if (result.user_data) {
      userDataInput.value = result.user_data;
    }
  });

  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const userData = userDataInput.value.trim();
    chrome.storage.local.set({ openai_api_key: apiKey, user_data: userData }, () => {
      statusEl.textContent = 'Settings saved!';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    });
  });

  fillButton.addEventListener('click', () => {
    // Trigger the content script to start scanning and filling
    // This sends a message to the content script to start the process
    statusEl.textContent = 'Filling fields...';
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'fillFields'}, (response) => {
        if (chrome.runtime.lastError) {
          // Possibly no response from content script if no form is there
          statusEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else {
          statusEl.textContent = response && response.status ? response.status : 'Done!';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
      });
    });
  });
}); 