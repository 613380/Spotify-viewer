const express = require('express');
const querystring = require('querystring');
var app = express();
const port = 1410;

var client_id = 'client-id'; // set this to your client id
var client_secret = 'client-secret' // change this to be your client secret

var redirect_uri = 'http://localhost:1410/callback';



const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

app.get('/login', (req, res) => {
    var scope = 'user-read-currently-playing user-modify-playback-state user-read-playback-state';

    var state = generateRandomString(16)

    let authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
          response_type: 'code',
          client_id: client_id,
          scope: scope,
          redirect_uri: redirect_uri,
          state: state
        });
    console.log(authUrl);
    res.redirect(authUrl);
});

app.get('/callback', async function(req, res) {

    console.info('Recieved callback request');

    var code = req.query.code || null;
    var state = req.query.state || null;
  
    if (state === null) {
        console.info('State mismatch');
        res.redirect('/#' +
            querystring.stringify({
            error: 'state_mismatch'
            }));
    } else {
        console.info('Setting auth options..');
        let url = `https://accounts.spotify.com/api/token?${querystring.stringify({
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
          })}`;
        let r = await fetch(url, {
            method: 'POST',
            headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },

        });
        if (!r.ok) {
            throw new Error(`Failed to get token: ${r.status}`);
        }
        
        req.app.locals.authOptions = await r.json();
        
        console.info('Set auth options.');
        console.info('Redirecting to home page.');
        res.redirect('/')
    }
});



app.get('/', (req, res) => {
    console.info('User has loaded page /')
    if (req.app.locals.authOptions === undefined) {
        console.info('Auth code not found, redirecting..');
        res.redirect('/login');
        console.info('Redirected to login.')
    }
    else {
        console.info(req.app.locals.authOptions);
        res.sendFile(__dirname + '/views/web.html');
    }
})

// Static files
app.use(express.static('public'));


app.get('/logged', (req, res) => {
    res.sendFile(__dirname + '/views/logged.html')
});

app.get('/info', async (req, res) => {
    if (req.app.locals.authOptions) {

        let response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: {
                Authorization: `Bearer ${req.app.locals.authOptions.access_token}`
            }
        })

        if (!response.ok) {
            console.error('Failed to fetch player info:', response.status, response.statusText);
            return res.status(response.status).json({ error: response.statusText });
        }

        try {
            let json = await response.json()
            if (json && json.item) {
                res.json({
                    trackName: json.item.name,
                    playing: json.is_playing,
                    image: json.item.album.images[0].url,
                    artist: json.item.artists[0].name,
                    length: json.item.duration_ms,
                    progress: json.progress_ms
                });
            } else {
                res.status(200).json({ message: 'No track currently playing' });
            }
        }
        catch (e) {
            console.log(e);
            console.log(response);
        }
    }   
})

app.post('/skipForwards', async (req, res) => {
    if (req.app.locals.authOptions) {
        console.log('Auth exists')
        let response = await fetch('https://api.spotify.com/v1/me/player/next', {
            headers: {
                Authorization: `Bearer ${req.app.locals.authOptions.access_token}`
            },
            method:'post'
        })
        console.log(response)

        res.status(response.status)
    } else {
        console.log('Auth invalid')
    }

});

app.post('/skipBackwards', async (req, res) => {
    if (req.app.locals.authOptions) {
        console.log('Auth exists')
        let response = await fetch('https://api.spotify.com/v1/me/player/previous', {
            headers: {
                Authorization: `Bearer ${req.app.locals.authOptions.access_token}`
            },
            method:'post'
        })
        console.log(response)

        res.status(response.status)
    } else {
        console.log('Auth invalid')
    }

});

app.put('/pause', async (req, res) => {
    console.log('toggle')
    if (req.app.locals.authOptions) {
        var current = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                Authorization: `Bearer ${req.app.locals.authOptions.access_token}`  
            },
            method:'get'
        })
        
        var json = await current.json()

        console.log(json)

        var context = json.uri
        var position = json.progress_ms
        
        console.log('playing: ', current)
        if (json.is_playing === false) {
            await fetch('https://api.spotify.com/v1/me/player/play', {

                headers: {
                    Authorization: `Bearer ${req.app.locals.authOptions.access_token}`,
                    ContentType: 'application/json'
                },

                body: JSON.stringify({
                    "context_uri": context,
                
                    "position_ms": position
                }),

                method:'put'

            })

        } else {
            console.log('pausing...')
            var response = await fetch('https://api.spotify.com/v1/me/player/pause', {

                headers: {
                    Authorization: `Bearer ${req.app.locals.authOptions.access_token}`,
                },

                method:'put'

            })

            console.log('response', response)

        }



    } else {
        console.log('Auth invalid')
    }
    
});

app.listen(port, () => console.info(`Listening on port ${port}`));