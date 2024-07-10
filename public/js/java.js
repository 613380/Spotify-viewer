
// Send requests every second
addEventListener('DOMContentLoaded', (evt) => {

    document.getElementById('forward').onclick = skipR
    document.getElementById('backward').onclick = skipL
    document.getElementById('pauseButton').onclick = pause

    setInterval(update, 250)
});

function skipR() {
    console.log('button pressed!')
    fetch('/skipForwards', {method: 'post'})
}

function skipL() {
    fetch('/skipBackwards', {method: 'post'})
}

function pause() {
    fetch('/pause', {method: 'put'})
}

function updateProgress(total, current) { // Update the track timeline
        var width = Math.floor((31.5/100) * window.innerWidth * (current/total)) + 'px';
        document.getElementById('progress').style.width = width;
}

function update() {
    fetch('/info')
        .then(response => response.json())
        .then(data =>{
            if (document.getElementById('trackName').textContent != data.trackName) { // Calls if the track has changed
                document.getElementById('trackName').textContent = data.trackName;
                document.getElementById('albumCover').src = data.image;
                document.getElementById('artist').innerText = data.artist
            }

            if (data.playing == false) { // Calls if the track is paused
                document.getElementById('pause').src = "images/play.png"
            }
            else { // Calls if the track is playing
                document.getElementById('pause').src = "images/pause.png"
                updateProgress(data.length, data.progress);
            }
    })    
}