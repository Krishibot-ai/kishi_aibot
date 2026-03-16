async function callAI(userText){

const API_KEY = process.env.OPENROUTER_API_KEY;

const response = await fetch("https://openrouter.ai/api/v1/chat/completions",{
method:"POST",
headers:{
"Authorization":"Bearer "+API_KEY,
"Content-Type":"application/json"
},
body:JSON.stringify({
model:"meta-llama/llama-3-8b-instruct:free",
messages:[
{role:"system",content:"You are an agriculture expert AI helping Indian farmers."},
{role:"user",content:userText}
]
})
});

const data = await response.json();

if(data.choices && data.choices.length>0){
return data.choices[0].message.content;
}else{
return "AI se answer nahi mila.";
}

}
