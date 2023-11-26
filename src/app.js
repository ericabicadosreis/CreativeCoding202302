const outputElement = document.getElementById('output');
const video = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

let imageDescriptions = []; // Array per mantenere le immagini e le descrizioni

// PARTE CAMERA

async function startCamera() {
    try {
        const constraints = {
            audio: false,
            video: {
                facingMode: "environment",
                width: 700, // larghezza ideale
                height: 700, // altezza ideale
                left: 0,
                right: 0,

            }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if ("srcObject" in video) {
            video.srcObject = stream;
        } else {
            // Avoid using this in new browsers
            video.src = window.URL.createObjectURL(stream);
        }

    } catch (error) {
        console.error('Error accessing camera:', error);
    }
}

// Funzione per visualizzare l'immagine
function displayCapturedImage(imgId, imgSrc, descriptionText, captureDate) {
    // Crea un oggetto che rappresenta l'immagine e la descrizione
    const imageData = {
        id: imgId,
        src: imgSrc,
        description: descriptionText,
        date: captureDate
    };

    // Aggiungi l'oggetto all'inizio dell'array
    imageDescriptions.unshift(imageData);
    document.querySelector("#capture").innerHTML = "Capture image";
    updateOutput(); // Aggiorna l'output ogni volta che viene catturata una nuova immagine
}

async function captureImage() {
    document.querySelector("#capture").innerHTML = "loading ..." 
    context.canvas.width = video.videoWidth;
    context.canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const imgSrc = canvas.toDataURL('image/png');
    const currentDate = new Date();
    const captureDate = currentDate.toISOString(); // Formatta la data come stringa

    
    const objectRecognized = await detectObjectsGoogleVision(imgSrc);
    const cohereDescription = await generateDescription(objectRecognized);
    

    displayCapturedImage(imageDescriptions.length + 1, imgSrc, cohereDescription, captureDate);

}

// Funzione per la visualizzazione della data e dell'ora
function formatDateTime(date) {
    const options = {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    };
    return date.toLocaleString('en-US', options).replace(',', ''); // Regola la lingua se necessario
}

function updateOutput() {
    let containers = document.getElementById('imageContainer');
    
    // Svuota il contenitore
    containers.innerHTML = '';

    // Aggiungi le immagini e le descrizioni nel modo corretto
    for (let i = 0; i < imageDescriptions.length; i++) {
        const desc = imageDescriptions[i];

        let imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';

        const img = new Image();
        img.src = desc.src;
        imgContainer.appendChild(img);

        const description = document.createElement('p');
        const formattedDate = formatDateTime(new Date(desc.date));
        description.textContent = `${formattedDate} - ${desc.description}`;
        imgContainer.appendChild(description);

        containers.appendChild(imgContainer);
    }
}

//outputElement.innerHTML

async function detectObjectsGoogleVision(imgSrc) {
    const apiKey = 'AIzaSyConyle9qljRMYS9VwR4a8ZlUUEoY6aRwk';
    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const base64Image = imgSrc.split(',')[1]; // Estrai la parte codificata in base64

    const requestData = {
        requests: [
            {
                image: {
                    content: base64Image,
                },
                features: [
                    {
                        type: 'OBJECT_LOCALIZATION',
                        maxResults: 5,
                    },
                ],
            },
        ],
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();
        const objects = data.responses[0].localizedObjectAnnotations;

        if (objects.length > 0) {
            const objectNames = objects.map((obj) => obj.name).join(', ');
            return objectNames;
        } else {
            return 'Nessun oggetto riconosciuto';
        }
    } catch (error) {
        console.error('Errore nella richiesta Google Vision API:', error);
        return 'Errore nella rilevazione degli oggetti';
    }
}


async function getBase64Image(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result.split(',')[1]);
        };
        reader.readAsDataURL(file);
    });
}

async function generateDescription(objectRecognized) {
    let responseContainer = document.querySelector("#output")
    try {
        const response = await fetch("https://api.cohere.ai/v1/chat", {
            method: "POST",
            headers: {
                Authorization: "Bearer FfgibsqJTi4lNUGeIHBlyr5ZVbg8OeW9S872zj7k", // Sostituisci con la tua chiave API reale
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "command",
                message: `describe the smell of these things: ${objectRecognized}`,
                max_tokens: 100,
            }),
        });

        const data = await response.json();
        return data.text; // Modifica in base alla struttura della risposta
    } catch (error) {
        console.error('Errore durante la richiesta Cohere AI:', error);
        return 'Errore nella generazione della descrizione';
    }
}


//inizializza la fotocamera quando la pagina di carica
window.onload = startCamera;

console.log()