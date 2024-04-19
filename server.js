const OpenAI = require('openai')
const fs = require('fs')
const http = require('http')
const https = require('https')
const express = require('express')
const axios = require('axios');
const cors = require('cors')
require('dotenv').config()
const path = require('path');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

var options = {
    key: fs.readFileSync('./ssl/privatekey.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem'),
};

const app = express()
const httpApp = express()

app.use(express.json())
app.use(cors())

app.assistant = null;
app.thread = null;

app.use(express.static(path.join(__dirname, 'build')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
})

app.post('/login', async (req, res) => {

    const {userName, password} = req.body;

    const response = await axios.post(`${process.env.AUTH_SERVER}/auth/sinirji_service/user_login`,
        {
            user_name : userName,
            password: password,
            service_tag: 'basic'
        })

    // store token for future authorizations
    if (response.data.status === 200) {

        await axios.post(`${process.env.AUTH_SERVER}/auth/sinirji_service/user_store_token`,
            {
                user_token : response.data.data.token,
                user_id : response.data.data.user._id
            })
    }

    res.send({
        status : response.data.status,
        token : response.data.data.token,
        assistant_id : response.data.data.user.open_ai_assistant,
        file_ids: response.data.data.user.open_ai_file_ids
    });
})

app.post('/logout', async (req, res) => {

    const {auth_token} = req.body;

    // check user is valid
    const response = await axios.post(`${process.env.AUTH_SERVER}/auth/sinirji_service/user_delete_token`,
        {
            user_token: auth_token
        })

    res.send({
        status : response.data.status
    });
})

app.post('/completions', async (req, res) => {

    let data = {
        role : "assistant",
        content : 'An error has occurred. Unable to process request',
    };

    do {

        try {

            console.log(req.body);

            const {auth_token} = req.body;

            // check user is valid
            const response = await axios.post(`${process.env.AUTH_SERVER}/auth/sinirji_service/user_login`,
                {
                    service_tag: 'basic',
                    user_token: auth_token
                })

            // if not valid then don't process request
            if (response.data.status !== 200)
                break;

            console.log(req.body.assistant_id)
            app.assistant = await openai.beta.assistants.retrieve(req.body.assistant_id);

            if (!req.body.thread_id) {
                app.thread = await openai.beta.threads.create();
            }

            const thread_id = req.body.thread_id ? req.body.thread_id : app.thread.id;

            await openai.beta.threads.messages.create(thread_id, {
                role: "user",
                content: req.body.message,
                file_ids: req.body.file_ids
            })

            const new_run = await openai.beta.threads.runs.create(thread_id, {
                assistant_id: app.assistant.id,
            })

            let run = null;
            do {
                run = await openai.beta.threads.runs.retrieve(
                    new_run.thread_id,
                    new_run.id
                )

                await new Promise(resolve => setTimeout(resolve, 500));

            } while (run.status === 'in_progress')

            const messages = await openai.beta.threads.messages.list(new_run.thread_id)

            data.content = messages.body.data[0].content[0].text.value;
            data.thread_id = new_run.thread_id;
        }
        catch(err) {

            break;
        }

        //messages.body.data.forEach((message) => {
        //    console.log('--- message ---')
        //    console.log(message)
        //})

        /*const options = {
            method : "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{role: "user", content: req.body.message}],
                max_tokens: 100
            })
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', options);
            const data = await response.json();
            console.log('completions')
            //console.log(data.choices[0].message)
            console.log(data)
            //res.send(data.choices[0].message);
        }
        catch (error) {
            console.error(error)
        }*/

    } while (0);

    res.send(data);
})

app.run = async function()  {

    httpApp.get("*", function(req, res, next) {
        res.redirect("https://" + req.headers.host + req.path);
    });

    http.createServer(httpApp).listen(80, function() {
        console.log("Http server running on port 80");
    });

    https.createServer(options, app).listen(process.env.PORT, () => console.log('Https server running on port ' + process.env.PORT))

    /*app.listen(process.env.PORT, function() {
        console.log("Http server running on port " + process.env.PORT);
    });*/
}

app.run();



