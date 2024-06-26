import {useState, useEffect, useRef} from 'react'
import {useCookies} from "react-cookie";
import MarkdownView from "react-showdown";

import Auth from "./components/Auth";

const App = () => {

    const [value, setValue] = useState(null)
    const question = useRef(null)
    const [message, setMessage] = useState(null)
    const [previousChats, setPreviousChats] = useState([])
    const [currentTitle, setCurrentTitle] = useState(null)
    const [cookies, setCookie, removeCookie] = useCookies(null)

    const authToken = cookies.token;
    const assistantID = cookies.assistant_id;
    const fileIDs = cookies.file_ids;

    const currentChat = previousChats.filter(previousChat => previousChat.title === currentTitle)
    const uniqueTitles = Array.from(new Set(previousChats.map(previousChat => previousChat.title)))

    const createNewChat = () => {
        setMessage(null)
        setValue("")
        setCurrentTitle(null)
    }

    const Logout = async () => {
        removeCookie('token')
        removeCookie('assistant_id')
        removeCookie('file_ids')

        //await fetch(`http://localhost:8000/logout`, {
        await fetch(`https://chat.sinirji.com/logout`, {
            method : 'POST',
            headers: {'Content-Type' : 'application/json'},
            body : JSON.stringify(({auth_token: authToken}))
        })
    }

    const handleClick = (uniqueTitle) => {
        setCurrentTitle(uniqueTitle)
        setMessage(null)
        setValue("")
    }

    const getMessages = async () => {

        question.current.value = "";
        document.getElementById("question_input").focus();

        let thread_id = currentChat.length ? currentChat[0].thread_id : null

        const options = {
            method : "POST",
            body : JSON.stringify(({
                message : value,
                thread_id : thread_id,
                auth_token: authToken,
                assistant_id : assistantID,
                file_ids : fileIDs
            })),
            headers : {
                "Content-Type" : "application/json"
            }
        }

        try {
            //const response = await fetch(`http://localhost:8000/completions`, options)
            const response = await fetch(`https://chat.sinirji.com/completions`, options)
            const data = await response.json()
            setMessage(data)
        }
        catch(error) {
            console.error(error)
        }
    }

    useEffect(() => {
        if (!currentTitle && value && message) {
            setCurrentTitle(value)
        }
        if (currentTitle && value && message) {
            setPreviousChats(prevChats => (
                [...prevChats,
                    {
                        title : currentTitle,
                        role: "user",
                        content: value,
                        thread_id: message.thread_id
                    },
                    {
                        title : currentTitle,
                        role : message.role,
                        content: message.content,
                        thread_id: message.thread_id
                    }]
            ))
        }
    }, [message, currentTitle])


  return (
    <div className="app">
        {!authToken && <Auth/>}
        {authToken &&
            <>
            <section className="side-bar">
                <button onClick={createNewChat}>+ New chat</button>
                <ul className="history">
                    {uniqueTitles?.map((uniqueTitle, index) => <li key={index} onClick={() => handleClick(uniqueTitle)}>{uniqueTitle}</li>)}
                </ul>
                <nav>
                    <button onClick={Logout}>Logout</button>
                    <p>Symposium Technologies</p>
                </nav>
            </section><section className="main">
                  {!currentTitle && <h1>SinirjiGPT</h1>}
                  <ul className="feed">
                      {currentChat?.map((chatMessage, index) => <li key={index}>
                          <p className="role">{chatMessage.role}</p>
                          <p className="response">
                              <MarkdownView
                              markdown={chatMessage.content}
                              options={{ tables: true, emoji: true }}
                              />
                          </p>
                      </li>)}
                  </ul>
                  <div className="bottom-section">
                      <div className="input-container">
                          <input id="question_input" autoFocus ref={question} onChange={(e) => setValue(e.target.value)}/>
                          <div id="submit" onClick={getMessages}>➢</div>
                      </div>

                      <p className="info">
                          SinirjiGPT Version 1
                      </p>
                  </div>
            </section>
            </>}
    </div>
  );
}

export default App;
