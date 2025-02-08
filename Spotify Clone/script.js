console.log("JavaScript here");

let currentSong = new Audio();
let playButton = null;
let previous = null;
let next = null;
let songs = [];
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function getSongs(folder) {
    currFolder = folder;
    try {
        let response = await fetch(`http://127.0.0.1:3000/${folder}/`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        let text = await response.text();

        let div = document.createElement("div");
        div.innerHTML = text;
        let as = div.getElementsByTagName("a");

        let songList = [];
        for (let element of as) {
            if (element.href.endsWith(".mp3")) {
                songList.push(decodeURIComponent(element.href.split(`/${folder}/`)[1]));
            }
        }
        return songList;
    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

const playMusic = (track, pause = false) => {
    currentSong.src = `/${currFolder}/` + encodeURIComponent(track);
    if (!pause) {
        currentSong.play().catch(err => console.error("Playback error:", err));
        if (playButton) playButton.src = "pause.svg";
    } else {
        playButton.src = "playbutton.svg";
    }

    document.querySelector(".songinfo").textContent = decodeURI(track);
    document.querySelector(".songtime").textContent = "00:00 / 00:00";
    
    highlightCurrentSong(track);
};

function highlightCurrentSong(track) {
    document.querySelectorAll(".songList ul li").forEach(li => {
        li.classList.remove("active");
        if (li.innerText.includes(track)) li.classList.add("active");
    });
}

async function displayAlbums() {
    let response = await fetch(`http://127.0.0.1:3000/songs/`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    let text = await response.text();
    let div = document.createElement("div");
    div.innerHTML = text;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");

    for (let e of anchors) {
        if (e.href.includes("/songs")) {
            let folder = e.href.split("/").slice(-2)[0];

            try {
                let res = await fetch(`http://127.0.0.1:3000/songs/${folder}/info.json`);
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                let json = await res.json();

                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">
                        <div class="play">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                            </svg>
                        </div>
                        <img src="/songs/${folder}/cover.jpg" alt="${json.title}">
                        <h2>${json.title}</h2>
                        <p>${json.description}</p>
                    </div>`;

            } catch (error) {
                console.error(`Error fetching album info for ${folder}:`, error);
            }
        }
    }

    // Attach click event to dynamically created elements
    document.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", async () => {
            let folder = `songs/${card.dataset.folder}`;
            await loadSongs(folder);
        });
    });
}

async function loadSongs(folder) {
    songs = await getSongs(folder);
    if (songs.length === 0) {
        console.error("No songs found.");
        return;
    }

    let songUL = document.querySelector(".songList ul");
    songUL.innerHTML = "";

    songs.forEach(song => {
        let li = document.createElement("li");
        li.innerHTML = `
            <img class="invert" src="music.svg" alt="Music Icon">
            <div class="info">
                <div>${song}</div>
                <div>Dhirendra</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="playbutton.svg" alt="Play Button"/>
            </div>
        `;
        li.addEventListener("click", () => playMusic(song));
        songUL.appendChild(li);
    });
}

async function main() {
    await loadSongs("songs/ncs");
    await displayAlbums();

    playButton = document.getElementById("play");
    previous = document.getElementById("previous");
    next = document.getElementById("next");

    if (playButton) playButton.src = "playbutton.svg";

    playButton?.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            playButton.src = "pause.svg";
        } else {
            currentSong.pause();
            playButton.src = "playbutton.svg";
        }
    });

    currentSong.addEventListener("timeupdate", () => {
        if (!isNaN(currentSong.duration)) {
            document.querySelector(".songtime").textContent =
                `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            let progress = (currentSong.currentTime / currentSong.duration) * 100 || 0;
            document.querySelector(".circle").style.left = `${progress}%`;
        }
    });

    document.querySelector(".seekbar").addEventListener("click", (e) => {
        if (!isNaN(currentSong.duration)) {
            let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
            document.querySelector(".circle").style.left = `${percent}%`;
            currentSong.currentTime = (currentSong.duration * percent) / 100;
        }
    });

    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    previous.addEventListener("click", () => {
        let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (index > 0) playMusic(songs[index - 1]);
    });

    next.addEventListener("click", () => {
        let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (index < songs.length - 1) playMusic(songs[index + 1]);
    });

    currentSong.addEventListener("ended", () => {
        let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").pop()));
        if (index < songs.length - 1) playMusic(songs[index + 1]);
    });

    document.querySelector(".range input").addEventListener("input", (e) => {
        currentSong.volume = parseFloat(e.target.value) / 100;
    });

    document.addEventListener("keydown", (event) => {
        if (event.code === "Space") {
            event.preventDefault();
            playButton.click();
        }
    });

    // add event listner to mute the track

    document.querySelector(".volume>img").addEventListener("click", e=>{
        console.log(e.target)
        if(e.target.src.includes("volume.svg")){
            e.target.src = e.target.src.replace("volume.svg", "mute.svg")
            currentSong.volume = 0;
        }
        else{
            e.target.src = e.target.src.replace("mute.svg", "volume.svg")


            currentSong.volume = .10;


        }
    })

}

main();
