import { OpenAI } from 'openai';
import { exec } from 'node:child_process';

const OPENAI_API_KEY = "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";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function getWeatherInfo(cityName){
    return `${cityName} has 43 Degree C`;
}

function executeCommand(command){
    return new Promise((resolve, reject) => {
        exec(command, function (err, stdout, stderr) {
            if(err){
                return reject(err);
            }
            resolve(`stdout: ${stdout}\nstderr: ${stderr}`);
        });
    });
}

const TOOLS_MAP = {
    getWeatherInfo: getWeatherInfo,
    executeCommand: executeCommand
}

const SYSTEM_PROMPT = `
    You are an helpful AI Assitant who is designed to resolve user query.
    You work on START, THINK, ACTION, OBSERVE and OUTPUT mode.

    In the START phase user gives a query to you.
    Then, you THINK how to resolve that query atleast 3-4 times and make sure that everything is clear.
    If there is a need to call a tool, you call an ACTION event with tool and input parameters.
    If there is an ACTION call, wait for the OBSERVE that is output of the tool.
    Based on the OBSERVE from the previous step, you either output or repeat the loop.

    RULES:
    - Always wait for next step.
    - Always output a single step and wait for next step.
    - Output must be strictly JSON
    - Only call tool action from available tools only.
    - Strictly follow the output format in JSON.

    Available Tools - 
    - getWeatherInfo(city: String) - string
    - executeCommand(command: String) - string Executes a given linux command on user's device and returns the STDOUT and STDIN

    Example - 
    START - what is weather of patiala?
    THINK - The user is asking for weather of patiala.
    THINK - From the available tools, I must call getWeatherInfo to get weather of Patiala
    ACTION - call tool getWeaherInfo("Patiala")
    OBSERVE - 32 Degree C
    THINK - The output of getWeatherInfo for Patiala is 32 Degree C
    OUTPUT - Hey, The weather of Patiala is 32 Degree C which is quite hot

    Output Example: 
    { "role": "user", "content": "What is weather of Patiala?" }
    { "step": "think", "content": "The user is asking for weather of Patiala?" }
    { "step": "think", "content": "From the available tools, I must call getWeatherInfo tool to get weather of Patiala" }
    { "step": "action", "tool": "getWeatherInfo", "input":"Patiala" }
    { "step": "observe", "content": "32 Degree C" }
    { "step": "think", "content": "The output of getWeatherInfo for Patiala is 32 Degree C" }
    { "step": "output", "content": "Hey, The weather of Patiala is 32 Degree C which is quite hot" }

    Output format:
    { "Step": "string", "tool": "string", "input":"string", "content":"string"}
`

async function init() {

    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        }
    ]

    const userQuery = 'Create a todo folder and create a todo app with HTML, CSS and JS fully working';
    messages.push({role: "user", content: userQuery});

    while(true){
        const response = await client.chat.completions.create({
            model: 'gpt-4.1-mini',
            response_format: {type: 'json_object'},
            messages: messages,
        });

        messages.push({
            role: 'assistant',
            content: response.choices[0].message.content,
        });

        const parsed_response = JSON.parse(response.choices[0].message.content);

        if(parsed_response.step && parsed_response.step === 'action'){
            const tool = parsed_response.tool;
            const input = parsed_response.input;

            const value = await TOOLS_MAP[tool](input);
            console.log(`Tool Call ${tool}: (${input}): ${value}`);

            messages.push({
                role: 'assistant',
                content: JSON.stringify({step: 'observe', content: 'value'})
            });

            continue;
        }
    }
}

init();