// background.js: The service worker that listens for messages from content scripts,
// calls the OpenAI API, and returns structured output.

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'fill-form') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'fillFields'});
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCompletion') {
    console.log('Background: Received getCompletion request', request);
    const {fieldsInfo} = request;

    // Retrieve API key and user data from storage
    chrome.storage.local.get(['openai_api_key', 'user_data'], async (result) => {
      console.log('Background: Retrieved storage data', {
        hasApiKey: !!result.openai_api_key,
        hasUserData: !!result.user_data
      });
      
      const apiKey = result.openai_api_key;
      const userData = result.user_data || "";

      if (!apiKey) {
        console.error('Background: No API key found');
        sendResponse({error: 'No OpenAI API key saved.'});
        return;
      }

      try {
        // Construct the prompt
        const fieldsDescription = fieldsInfo.map((f, i) => {
          const labelInfo = (f.labels.length > 0) ? `labels: ${f.labels.join(', ')}` : '';
          const ariaLabel = f.ariaLabel ? `aria-label: ${f.ariaLabel}` : '';
          const validationInfo = [
            f.required ? 'required' : '',
            f.pattern ? `pattern: ${f.pattern}` : '',
            f.minLength ? `minLength: ${f.minLength}` : '',
            f.maxLength ? `maxLength: ${f.maxLength}` : '',
            f.validationMessage ? `validation: ${f.validationMessage}` : ''
          ].filter(v => v).join(', ');
          
          const optionsInfo = f.options?.length > 0 ? `options: [${f.options.join(', ')}]` : '';
          const autocomplete = f.autocomplete ? `autocomplete: ${f.autocomplete}` : '';
          
          return `Field #${i+1}: type=${f.type}, name=${f.name}, id=${f.id}, placeholder=${f.placeholder}, ${labelInfo} ${ariaLabel} ${validationInfo} ${optionsInfo} ${autocomplete}`;
        }).join('\n');

        const systemPrompt = `You are an expert at structured data extraction and form filling. Your task is to analyze form fields and provide appropriate values from user data.

Important rules:
1. Only fill fields where you have relevant information from the user data
2. Return empty string ("") for fields you shouldn't fill:
   - Password fields
   - Search boxes or search-related fields
   - Security questions
   - Verification codes
3. For select/dropdown fields, send a value that matches one of the available options
4. Make reasonable assumptions based on the context.
`;

        const systemMessage = {
          "role": "system",
          "content": systemPrompt
        };

        const userMessageContent = `Page Context:
Title: ${request.pageContext.title}
URL: ${request.pageContext.url}
Description: ${request.pageContext.metaDescription}
Main Heading: ${request.pageContext.h1}

Here are the fields found on the page:\n${fieldsDescription}\n\nUser data:\n-------\n${userData}\n--------\n\nPlease return a JSON with the following structure:\n{\n  "fields": [\n    {"key": "1", "value": "value_for_field_1"},\n    {"key": "2", "value": "value_for_field_2"},\n    ...\n  ]\n}\n\n`;

        const userMessage = {
          "role": "user",
          "content": userMessageContent
        };

        console.log('Background: Constructed prompt', {
          numFields: fieldsInfo.length,
          userDataLength: userData.length
        });

        console.log('Background: Sending request to OpenAI API');
        console.log('User message:', userMessage.content);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [systemMessage, userMessage],
            temperature: 0,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "form_field_values",
                schema: {
                  type: "object",
                  properties: {
                    fields: {
                      type: "array",
                      description: "Array of field entries containing field numbers and their corresponding values",
                      items: {
                        type: "object",
                        properties: {
                          key: {
                            type: "string",
                            description: "The field number as a string (e.g., '1', '2')"
                          },
                          value: {
                            type: "string",
                            description: "The value to be filled into the form field"
                          }
                        },
                        required: ["key", "value"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["fields"],
                  additionalProperties: false
                },
                strict: true
              }
            }
          })
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Background: OpenAI API error', text);
          sendResponse({error: `OpenAI API error: ${text}`});
          return;
        }

        const data = await response.json();
        console.log('Background: Received OpenAI response', data);
        
        const assistantMessage = data.choices?.[0]?.message?.content;
        if (!assistantMessage) {
          throw new Error('Invalid response format from OpenAI API');
        }

        const parsed = JSON.parse(assistantMessage);
        console.log('Background: Using response', parsed);

        // Convert array format to object format
        const fieldsObject = {};
        if (parsed.fields && Array.isArray(parsed.fields)) {
          parsed.fields.forEach(field => {
            if (field.value && field.value.trim() !== '') {
              fieldsObject[field.key] = field.value;
            }
          });
        }

        console.log('Background: Sending response back to content script', fieldsObject);
        sendResponse({fields: fieldsObject, raw: assistantMessage});
      } catch (err) {
        console.error('Background: Error processing request', err);
        sendResponse({error: err.message});
      }
    });

    return true;
  }
});
