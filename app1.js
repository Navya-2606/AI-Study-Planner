// Function to handle .docx file upload
document.getElementById('docxInput').addEventListener('change', function(event) {
    const reader = new FileReader();
    reader.onload = function(event) {
        mammoth.extractRawText({ arrayBuffer: event.target.result })
            .then(function(result) {
                document.getElementById('inputText').value = result.value;
            })
            .catch(function(err) {
                console.log(err);
                alert("Failed to read the document!");
            });
    };
    reader.readAsArrayBuffer(this.files[0]);
  });
  
  async function summarizeText(mode) {
    const inputText = document.getElementById('inputText').value.trim();
    const resultArea = document.getElementById('resultArea');
  
    if (!inputText) {
        alert("Please upload a .docx file or paste text!");
        return;
    }
  
    resultArea.innerText = "Processing...";
  
    const cohere_api_key = "rnUIqyJdYfZyL29FQGljyDQBf4S00GMakSjEtoxF"; //  Replace this
  
    let prompt = "";
  
    if (mode === "summary") {
        prompt = `
        Summarize the following document into a clear, detailed paragraph.
  
        Document:
        ${inputText}
        `;
    } else if (mode === "points") {
        prompt = `
        Summarize the following document into at least 10 detailed key bullet points, clearly explained.
  
        Document:
        ${inputText}
        `;
    }
  
    const response = await fetch("https://api.cohere.ai/v1/generate", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${cohere_api_key}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "command-r-plus",
            prompt: prompt,
            max_tokens: 1000,
            temperature: 0.3,
            k: 0,
            stop_sequences: []
        })
    });
  
    const result = await response.json();
  
    if (result.generations && result.generations.length > 0) {
        const output = result.generations[0].text.trim();
        resultArea.innerHTML = output.replace(/\n/g, "<br>");
        document.getElementById('saveBtn').style.display = "inline-block";
    } else {
        resultArea.innerText = "Error generating result.";
    }
    
  }
  function saveResult() {
    const text = document.getElementById('resultArea').innerText;
  
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AI_result.txt';
    link.click();
  
    URL.revokeObjectURL(url);
  }