// Handle profile saving
document.getElementById('saveProfileBtn').addEventListener('click', function(e) {
  e.preventDefault();
  
  const form = document.getElementById('profileForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Save profile data
  chrome.storage.local.set({profile: data}, () => {
    showStatus('Profile saved successfully!', 'success');
  });
});

// Handle opening options page for resume management
document.getElementById('openOptionsBtn').addEventListener('click', function(e) {
  e.preventDefault();
  
  // First save the current profile data
  const form = document.getElementById('profileForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  chrome.storage.local.set({profile: data}, () => {
    // Then open the options page
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        showStatus('Error opening options page: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('Profile saved and opening resume manager...', 'success');
        setTimeout(() => window.close(), 1000);
      }
    });
  });
});

// Show resume count
function updateResumeCount() {
  chrome.storage.local.get({resumes: []}, (result) => {
    const count = result.resumes.length;
    const countDiv = document.getElementById('resumeCount');
    if (count === 0) {
      countDiv.textContent = 'No resumes uploaded yet';
    } else if (count === 1) {
      countDiv.textContent = '1 resume uploaded';
    } else {
      countDiv.textContent = `${count} resumes uploaded`;
    }
  });
}

document.getElementById('runAutoApply').addEventListener('click', function(e) {
  e.preventDefault(); // Prevent any default behavior
  
  // First save the current profile data
  const form = document.getElementById('profileForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  chrome.storage.local.set({profile: data}, () => {
    const button = this;
    const originalText = button.textContent;
    
    button.textContent = 'Starting...';
    button.disabled = true;
    
    chrome.runtime.sendMessage({action: 'startAutoApply'}, (response) => {
      if (response && response.status === 'started') {
        showStatus('Profile saved and auto apply started! Check the console for progress.', 'success');
        setTimeout(() => window.close(), 2000);
      } else {
        showStatus('Error: ' + (response?.message || 'Unknown error'), 'error');
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = type;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}

document.getElementById('testGptKeyBtn').onclick = async function() {
  const input = document.querySelector('[name="gptApiKey"]');
  const statusEl = document.getElementById('gpt-status');
  const apiKey = input.value.trim();
  if (!apiKey) {
    statusEl.textContent = '❌ Please enter an API key';
    statusEl.style.color = 'red';
    return;
  }
  statusEl.textContent = '⏳ Testing...';
  statusEl.style.color = 'orange';
  // Send a real test request to GPT
  try {
    const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'Llama-4-Maverick-17B-128E-Instruct',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is a dog?' }
        ],
        max_tokens: 30,
        temperature: 0.2
      })
    });
    if (!response.ok) throw new Error('API error: ' + response.status);
    const data = await response.json();
    if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      statusEl.textContent = '✅ GPT Connected';
      statusEl.style.color = 'green';
      console.log('[GPT TEST] Success:', data.choices[0].message.content);
    } else {
      statusEl.textContent = '❌ Invalid response from GPT';
      statusEl.style.color = 'red';
      console.error('[GPT TEST] Invalid response:', data);
    }
  } catch (e) {
    statusEl.textContent = '❌ GPT Test Failed';
    statusEl.style.color = 'red';
    console.error('[GPT TEST] Error:', e);
  }
};

window.onload = function() {
  // Load profile data
  chrome.storage.local.get('profile', (result) => {
    if (result.profile) {
      for (const [key, value] of Object.entries(result.profile)) {
        const input = document.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
      }
    }
  });
  
  // Set default GPT API key if not present
  chrome.storage.local.get('gptApiKey', (result) => {
    const statusEl = document.getElementById('gpt-status');
    const input = document.querySelector('[name="gptApiKey"]');
    if (result.gptApiKey && result.gptApiKey.trim() !== '') {
      if (input) input.value = result.gptApiKey;
      statusEl.textContent = '✅ GPT Connected';
      statusEl.style.color = 'green';
    } else {
      // Set the provided key as default
      const defaultKey = '759c5a30-a18e-461e-9564-f566ed4a3c5b';
      if (input) input.value = defaultKey;
      chrome.storage.local.set({gptApiKey: defaultKey});
      statusEl.textContent = '✅ GPT Key Set (Default)';
      statusEl.style.color = 'orange';
    }
  });
  
  // Update resume count
  updateResumeCount();
};

// When saving profile, also save GPT key
const saveBtn = document.getElementById('saveProfileBtn');
saveBtn.onclick = function() {
  const form = document.getElementById('profileForm');
  const data = {};
  for (const el of form.elements) {
    if (el.name) data[el.name] = el.value;
  }
  // Save GPT key
  const gptKey = document.querySelector('[name="gptApiKey"]').value.trim();
  chrome.storage.local.set({profile: data, gptApiKey: gptKey}, () => {
    showStatus('Profile and GPT key saved!', 'success');
  });
}; 