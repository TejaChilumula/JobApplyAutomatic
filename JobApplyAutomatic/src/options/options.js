const resumeForm = document.getElementById('resumeForm');
const resumeList = document.getElementById('resumeList');
const statusDiv = document.getElementById('status');

// Handle file selection feedback
document.getElementById('resumeFile').addEventListener('change', function() {
  const file = this.files[0];
  const resumeName = document.getElementById('resumeName').value.trim();
  
  if (file) {
    console.log('File selected:', file.name, file.size, file.type);
    
    // Auto-fill resume name if empty
    if (!resumeName) {
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      document.getElementById('resumeName').value = fileName;
    }
    
    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showStatus('File too large. Please select a file smaller than 10MB', 'error');
      this.value = ''; // Clear the file input
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      showStatus('Please select a PDF, DOC, or DOCX file', 'error');
      this.value = ''; // Clear the file input
      return;
    }
    
    showStatus(`File selected: ${file.name} (${Math.round(file.size / 1024)}KB)`, 'success');
  }
});

resumeForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name = this.resumeName.value.trim();
  const file = this.resumeFile.files[0];
  
  if (!name) {
    showStatus('Please enter a resume name', 'error');
    return;
  }
  
  if (!file) {
    showStatus('Please select a file', 'error');
    return;
  }
  
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showStatus('File too large. Please select a file smaller than 10MB', 'error');
    return;
  }
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    showStatus('Please select a PDF, DOC, or DOCX file', 'error');
    return;
  }
  
  console.log('Uploading resume:', name);
  console.log('File details:', {
    name: file.name,
    size: file.size,
    type: file.type
  });
  
  // Disable button during upload
  const button = document.getElementById('uploadBtn');
  const originalText = button.textContent;
  button.textContent = 'Uploading...';
  button.disabled = true;
  
  const reader = new FileReader();
  
  reader.onload = function() {
    try {
      console.log('File read successfully');
      console.log('File data length:', reader.result.length);
      
      chrome.storage.local.get({resumes: []}, (result) => {
        try {
          const resumes = result.resumes;
          
          // Check if resume with same name already exists
          const existingIndex = resumes.findIndex(r => r.name === name);
          if (existingIndex !== -1) {
            resumes[existingIndex] = {
              name, 
              file: reader.result, 
              type: file.type,
              size: file.size,
              uploadDate: new Date().toISOString()
            };
            console.log('Updated existing resume');
          } else {
            resumes.push({
              name, 
              file: reader.result, 
              type: file.type,
              size: file.size,
              uploadDate: new Date().toISOString()
            });
            console.log('Added new resume');
          }
          
          chrome.storage.local.set({resumes}, () => {
            if (chrome.runtime.lastError) {
              console.error('Error saving resume:', chrome.runtime.lastError);
              showStatus('Error saving resume: ' + chrome.runtime.lastError.message, 'error');
              button.textContent = originalText;
              button.disabled = false;
            } else {
              console.log('Resume saved successfully');
              renderResumes();
              resumeForm.reset();
              showStatus('Resume saved successfully!', 'success');
              button.textContent = originalText;
              button.disabled = false;
            }
          });
        } catch (storageError) {
          console.error('Error in storage operation:', storageError);
          showStatus('Error saving resume: ' + storageError.message, 'error');
          button.textContent = originalText;
          button.disabled = false;
        }
      });
    } catch (loadError) {
      console.error('Error processing file data:', loadError);
      showStatus('Error processing file: ' + loadError.message, 'error');
      button.textContent = originalText;
      button.disabled = false;
    }
  };
  
  reader.onerror = function() {
    console.error('Error reading file:', reader.error);
    showStatus('Error reading file. Please try again.', 'error');
    button.textContent = originalText;
    button.disabled = false;
  };
  
  reader.onabort = function() {
    console.log('File reading aborted');
    showStatus('File upload cancelled', 'error');
    button.textContent = originalText;
    button.disabled = false;
  };
  
  reader.readAsDataURL(file);
});

function renderResumes() {
  try {
    chrome.storage.local.get({resumes: []}, (result) => {
      try {
        console.log('Rendering resumes:', result.resumes.length);
        resumeList.innerHTML = '';
        
        if (result.resumes.length === 0) {
          const div = document.createElement('div');
          div.textContent = 'No resumes uploaded yet';
          div.className = 'no-resumes';
          resumeList.appendChild(div);
          return;
        }
        
        result.resumes.forEach((resume, idx) => {
          try {
            const div = document.createElement('div');
            div.className = 'resume-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = resume.name;
            nameSpan.className = 'resume-name';
            
            const sizeSpan = document.createElement('span');
            const fileSize = resume.size || (resume.file ? Math.round(resume.file.length / 1024) : 0);
            sizeSpan.textContent = `(${fileSize}KB)`;
            sizeSpan.className = 'resume-size';
            
            const dateSpan = document.createElement('span');
            if (resume.uploadDate) {
              const date = new Date(resume.uploadDate);
              dateSpan.textContent = date.toLocaleDateString();
              dateSpan.className = 'resume-date';
            }
            
            const del = document.createElement('button');
            del.textContent = 'Delete';
            del.className = 'delete-btn';
            del.title = 'Delete resume';
            
            del.onclick = () => {
              if (confirm(`Delete resume "${resume.name}"?`)) {
                try {
                  result.resumes.splice(idx, 1);
                  chrome.storage.local.set({resumes: result.resumes}, () => {
                    if (chrome.runtime.lastError) {
                      console.error('Error deleting resume:', chrome.runtime.lastError);
                      showStatus('Error deleting resume: ' + chrome.runtime.lastError.message, 'error');
                    } else {
                      console.log('Resume deleted successfully');
                      renderResumes();
                      showStatus('Resume deleted successfully', 'success');
                    }
                  });
                } catch (deleteError) {
                  console.error('Error in delete operation:', deleteError);
                  showStatus('Error deleting resume: ' + deleteError.message, 'error');
                }
              }
            };
            
            div.appendChild(nameSpan);
            div.appendChild(sizeSpan);
            div.appendChild(dateSpan);
            div.appendChild(del);
            
            resumeList.appendChild(div);
          } catch (resumeError) {
            console.error('Error rendering resume:', resume, resumeError);
          }
        });
      } catch (renderError) {
        console.error('Error in render operation:', renderError);
        showStatus('Error loading resumes: ' + renderError.message, 'error');
      }
    });
  } catch (error) {
    console.error('Error accessing storage:', error);
    showStatus('Error loading resumes: ' + error.message, 'error');
  }
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status';
  }, 3000);
}

window.onload = function() {
  console.log('Options page loaded');
  renderResumes();
}; 