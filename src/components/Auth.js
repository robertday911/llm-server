import {useState} from 'react'
import {useCookies} from "react-cookie";

const Auth = () => {
    const [error, setError] = useState(null)
    const [userName, setUserName] = useState(null)
    const [password, setPassword] = useState(null)
    const [cookies, setCookie, removeCookie] = useCookies(null)

    const  handleSubmit  = async (e) => {
        e.preventDefault()
        setError(null)

        const response = await fetch('http://3.90.50.218:8000/login', {
            method : 'POST',
            headers: {'Content-Type' : 'application/json'},
            body : JSON.stringify({userName, password})
        })

        const data = await response.json();
        if (data.status === 200) {
            setCookie('userName', userName)
            setCookie('token', data.token)
            setCookie('assistant_id', data.assistant_id)

            window.location.reload()
        }
        else {
            setError('Login Fail')
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-container-box">
                <form>
                    <h2>Please Login</h2>
                    <input
                        placeholder="Username"
                        onChange={(e) => setUserName(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <input type="submit" className="login" onClick={(e) => handleSubmit(e)}/>
                    {error && <p>{error}</p>}
                </form>
            </div>
        </div>
    )
}

export default Auth;