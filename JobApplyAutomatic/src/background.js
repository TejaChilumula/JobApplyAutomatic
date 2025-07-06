// Background service worker for Auto Job Apply Builder

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAutoApply') {
    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        // Inject scripts in order: gpt.js, then content.js
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ['src/gpt.js']
        }).then(() => {
          return chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['src/content.js']
          });
        }).then(() => {
          console.log('All content scripts injected successfully');
          
          // Send message to content script to start the auto apply process
          return chrome.tabs.sendMessage(tabs[0].id, {action: 'startAutoApply'});
        }).then((response) => {
          console.log('Auto apply process response:', response);
          sendResponse(response || {status: 'started'});
        }).catch((error) => {
          console.error('Error in auto apply process:', error);
          sendResponse({status: 'error', message: error.message});
        });
      } else {
        sendResponse({status: 'error', message: 'No active tab found'});
      }
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Listen for tab updates to handle navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a job application page
    const isJobPage = isJobApplicationPage(tab.url);
    if (isJobPage) {
      console.log('Job application page detected:', tab.url);
    }
  }
});

// Function to detect if a page is likely a job application
function isJobApplicationPage(url) {
  const jobKeywords = [
    'apply', 'application', 'careers', 'jobs', 'workday', 'greenhouse', 
    'lever', 'bamboohr', 'icims', 'smartrecruiters', 'jobvite'
  ];
  
  const urlLower = url.toLowerCase();
  return jobKeywords.some(keyword => urlLower.includes(keyword));
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Auto Job Apply Builder installed');
}); 