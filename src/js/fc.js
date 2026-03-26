localStorage.clear();

const container = document.getElementById('container');
const images = document.querySelectorAll('.bouncingImage');
const overlay = document.getElementById('overlay');
const speedAdjust = 1; // Adjust the speed of the bouncing images as needed
const minInterval = 10000; // Minimum interval in milliseconds
const maxInterval = 60000; // Maximum interval in milliseconds


// Function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Function to check if an image exists
    function imageExists(url, callback) {
    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = url;
}


//Cropping Transparent Spacing
function cropTransparent(imgElement) {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Needed if image is from another domain
    img.src = imgElement.src;

    img.onload = function () {
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;

        let top = img.height, bottom = 0, left = img.width, right = 0;

        // Find bounding box of non-transparent pixels
        for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
                const index = (y * img.width + x) * 4;
                const alpha = pixels[index + 3]; // Alpha channel

                if (alpha > 0) { // If not fully transparent
                    if (x < left) left = x;
                    if (x > right) right = x;
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                }
            }
        }

        // New cropped dimensions
        const newWidth = right - left + 1;
        const newHeight = bottom - top + 1;

        if (newWidth > 0 && newHeight > 0) {
            // Create a new canvas for cropped image
            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = newWidth;
            croppedCanvas.height = newHeight;
            const croppedCtx = croppedCanvas.getContext("2d");

            croppedCtx.drawImage(canvas, left, top, newWidth, newHeight, 0, 0, newWidth, newHeight);

            // Replace original image with cropped one
            imgElement.src = croppedCanvas.toDataURL();
        }
    };
}

const isRandom = getUrlParameter('random') === 'true';
if (isRandom) {
    // Generate 30 random Pokémon
    for (let i = 1; i <= 30; i++) {
        const randomPokemon = getRandomPokemon(); // Use the getRandomPokemon function
        const imgElement = document.getElementById('pokemon' + i);

        if (imgElement) {
            const imagePath = 'assets/images/Pokemon/' + randomPokemon + '.png';
            imageExists(imagePath, (exists) => {
                if (exists) {
                    imgElement.src = imagePath;
                    cropTransparent(imgElement);
                } else {
                    imgElement.alt = 'Image not Found';
                }
            });
        }
    }
} else {
    // Set image sources based on URL parameters
    for (let i = 1; i <= 6; i++) {
        const imageName = getUrlParameter('pokemon' + i).toLowerCase();
        const imgElement = document.getElementById('pokemon' + i);
        if (imageName) {
            let imagePath = 'assets/images/Pokemon/' + imageName + '.png';
            if (imageName.endsWith('-f-s')) {
                imagePath = 'assets/images/Pokemon/shiny/female/' + imageName.slice(0,-4) + '.png';
            } else if (imageName.endsWith('-f')) {
                imagePath = 'assets/images/Pokemon/female/' + imageName.slice(0,-2) + '.png';
            } else if (imageName.endsWith('-s')) {
                imagePath = 'assets/images/Pokemon/shiny/' + imageName.slice(0,-2) + '.png';
            }
            imageExists(imagePath, (exists) => {
                if (exists) {
                    imgElement.src = imagePath;
                    cropTransparent(imgElement);
                } else {
                    const regularImagePath = 'assets/images/Pokemon/' + imageName.slice(0,-2) + '.png';
                    imageExists(regularImagePath, (exists) => {
                        if (exists) {
                            imgElement.src = regularImagePath;
                            cropTransparent(imgElement);
                        } else {
                            imgElement.alt = 'Image not Found';
                        }
                    });
                }
            });
        } else if (i != 1 && !imageName) {
            imgElement.remove();
        }
        
    }
}


const velocities = Array.from(images).map(() => ({
    x: (Math.random() * 4 - 2) * speedAdjust,
    y: (Math.random() * 4 - 2) * speedAdjust  
}));

function getRandomPokemon() {
    const randomIndex = Math.floor(Math.random() * availablePokemon.length);
    return availablePokemon[randomIndex];
}

function updatePosition() {
    images.forEach((img, index) => {
        let posX = parseFloat(img.style.left) || 0;
        let posY = parseFloat(img.style.top) || 0;

        posX += velocities[index].x;
        posY += velocities[index].y;

        if (posX + img.width >= container.clientWidth -20 || posX <= 0+20) {
            velocities[index].x = -velocities[index].x;
        }
        if (posY + img.height >= container.clientHeight -20 || posY <= 0+20) {
            velocities[index].y = -velocities[index].y;
        }

        images.forEach((otherImg, otherIndex) => {
            if (index !== otherIndex) {
                const otherPosX = parseFloat(otherImg.style.left) || 0;
                const otherPosY = parseFloat(otherImg.style.top) || 0;

                // Define collision area
                const collisionSize = 25;

                const imgCenterX = posX + img.width / 2;
                const imgCenterY = posY + img.height / 2;
                const otherImgCenterX = otherPosX + otherImg.width / 2;
                const otherImgCenterY = otherPosY + otherImg.height / 2;

                if (Math.abs(imgCenterX - otherImgCenterX) < collisionSize &&
                    Math.abs(imgCenterY - otherImgCenterY) < collisionSize) {
                    velocities[index].x = -velocities[index].x;
                    velocities[index].y = -velocities[index].y;
                    velocities[otherIndex].x = -velocities[otherIndex].x;
                    velocities[otherIndex].y = -velocities[otherIndex].y;
                }
            }
        });

        const {scaleX, scaleY} = getScale(img);
        if (velocities[index].x > 0) {
            img.style.transform = `scale(${-Math.abs(scaleX)}, ${scaleY})`;
        } else {
            img.style.transform = `scale(${Math.abs(scaleX)}, ${scaleY})`;
        }

        img.style.left = posX + 'px';
        img.style.top = posY + 'px';
    });

    requestAnimationFrame(updatePosition);
}

function getScale(img){
    const transform = window.getComputedStyle(img).transform;

    if (transform === 'none') {
        return {scaleX: 1, scaleY: 1}; // Default scale if no transform is applied
    }

    const matrix = new DOMMatrix(transform);
    return {scaleX: matrix.a, scaleY: matrix.d};
}

function showHeartsForImage(img, index) {
    if (img.style.display === 'none') return;

    // const heartCount = Math.floor(Math.random() * 5) + 1;
    const heartCount = 2
    const hearts = [];

    const imgCenterX = parseFloat(img.style.left) + img.width / 2;
    const imgTopY = parseFloat(img.style.top);

    for (let i = 0; i < heartCount; i++) {
        const heart = document.createElement('img');
        heart.src = 'assets/images/misc/heart.png';
        heart.className = 'heart';
        spacing = 115;
        // heart.style.left = `${imgCenterX - (heartCount * 15) + i * 30}px`;
        heart.style.left = `${imgCenterX - ((heartCount - 1) * spacing) / 2 + i * spacing}px`;
        heart.style.top = `${imgTopY - 50}px`;
        heart.style.display = 'block';
        heart.style.transform = 'scale(0.75)';
        container.appendChild(heart);
        hearts.push(heart);
    }

    const originalVelocity = { ...velocities[index] };
    velocities[index] = { x: 0, y: 0 }; // Stop the image

    goodFriendship = Math.floor(Math.random()*100)+1;
    highFriendship = Math.floor(Math.random()*100)+1;

    if(goodFriendship > 50){
        setTimeout(() => {
            hearts.forEach((heart) => {
                heart.style.transform = "scale(1.2)";
            });
        }, 1000);
    }

    if(highFriendship > 75){
        setTimeout(() => {
            hearts.forEach((heart) => {
                heart.style.transform = "scale(1.75)";
            });
        }, 2000);
    }

    setTimeout(() => {
        hearts.forEach((heart) => {
            heart.remove();
        });
        velocities[index] = originalVelocity; // Resume the image movement
    }, 4000);

    // setTimeout(() => {
    //     hearts.forEach((heart) => {
    //         heart.remove();
    //     });
    //     velocities[index] = originalVelocity; // Resume the image movement
    // }, 3000);

    const nextInterval = Math.random() * (maxInterval - minInterval) + minInterval; // Random interval between minInterval and maxInterval
    setTimeout(() => showHeartsForImage(img, index), nextInterval);
}

function startShowingHearts() {
    images.forEach((img, index) => {
        const initialInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        setTimeout(() => showHeartsForImage(img, index), initialInterval);
    });
}

updatePosition();

const showHearts = getUrlParameter('friendship');
if (showHearts === 'true') {
    startShowingHearts();
}

const showOverlay = getUrlParameter('overlay');
if (showOverlay === 'true') {
    overlay.style.display = 'block';
    // overlay.style.backgroundColor = 'background-color: rgba(0, 121, 30, 0.325);'
    overlay.style.backgroundColor = 'rgba(111,175,111, 0.325)';
    container.style.backgroundColor = 'rgba(111,175,111, 0.9)';
    images.forEach(img => {
        img.style.filter = 'grayscale(90%)';
    });
}

const setDSSize =  getUrlParameter('ds')
if (setDSSize == 'true'){
    container.style.height = '859px';
    container.style.width = '1145px';
    images[1].style.left = '850px';
    images[3].style.left = '850px';
    images[5].style.left = '850px';
}

const scale = getUrlParameter('scale')
if (scale){
    images.forEach(img => {
        img.style.transform = `scale(${scale})`;
    });
}
