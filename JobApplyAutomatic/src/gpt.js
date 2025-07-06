// GPT integration for answering unknown questions

// Check if already initialized to prevent duplicate injection
if (window.GPTServiceInitialized) {
  console.log('GPT Service already initialized, skipping...');
} else {
  window.GPTServiceInitialized = true;

  class GPTService {
    constructor(apiKey) {
      this.apiKey = apiKey;
      this.baseURL = 'https://api.sambanova.ai/v1/chat/completions';
    }

    async generateAnswer(question, context = '') {
      if (!this.apiKey) {
        console.warn('No GPT API key provided');
        return 'I am a professional candidate with relevant experience for this position.';
      }

      try {
        const prompt = this.buildPrompt(question, context);
        
        const response = await fetch(this.baseURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'Llama-4-Maverick-17B-128E-Instruct',
            messages: [
              {
                role: 'system',
                content: 'You are a professional job applicant. Provide concise, relevant answers to job application questions. Keep responses professional and under 200 words.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`GPT API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error('Error calling GPT API:', error);
        return this.getFallbackAnswer(question);
      }
    }

    buildPrompt(question, context) {
      let prompt = `Question: ${question}\n\n`;
      
      if (context) {
        prompt += `Context: ${context}\n\n`;
      }
      
      prompt += `Please provide a professional and relevant answer to this job application question. `;
      prompt += `Focus on demonstrating relevant skills, experience, and enthusiasm for the role. `;
      prompt += `Keep the response concise and authentic.`;
      
      return prompt;
    }

    getFallbackAnswer(question) {
      const fallbackAnswers = {
        'salary': 'I am open to discussing salary based on the role requirements and market standards.',
        'experience': 'I have relevant experience in this field and am excited about this opportunity.',
        'why': 'I am passionate about this role and believe my skills align well with your requirements.',
        'strengths': 'I am detail-oriented, collaborative, and have strong problem-solving skills.',
        'weaknesses': 'I continuously work on improving my skills and learning new technologies.',
        'goals': 'I aim to grow professionally while contributing to the company\'s success.',
        'teamwork': 'I enjoy collaborating with diverse teams and believe in open communication.',
        'leadership': 'I have experience leading projects and mentoring team members.',
        'challenge': 'I enjoy tackling complex problems and finding innovative solutions.',
        'learning': 'I am committed to continuous learning and staying updated with industry trends.'
      };

      const questionLower = question.toLowerCase();
      
      for (const [key, answer] of Object.entries(fallbackAnswers)) {
        if (questionLower.includes(key)) {
          return answer;
        }
      }

      return 'I am a qualified candidate with relevant experience and am excited about this opportunity.';
    }

    // Function to detect if a question needs GPT assistance
    needsGPTAssistance(question, fieldType) {
      const questionLower = question.toLowerCase();
      
      // Skip basic fields that should be filled with profile data
      if (['name', 'email', 'phone', 'address', 'linkedin', 'github'].includes(fieldType)) {
        return false;
      }
      
      // Questions that typically need custom answers
      const gptKeywords = [
        'why', 'how', 'describe', 'explain', 'tell', 'what', 'when', 'where',
        'experience', 'skills', 'strengths', 'weaknesses', 'goals', 'challenges',
        'teamwork', 'leadership', 'learning', 'salary', 'expectations'
      ];
      
      return gptKeywords.some(keyword => questionLower.includes(keyword));
    }
  }

  // Export for use in content script
  window.GPTService = GPTService;
  
  console.log('GPT Service initialized successfully');
} 