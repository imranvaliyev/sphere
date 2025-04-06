const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const modal = document.getElementById('modal');
const modalText = document.getElementById('modal-text');
const closeModal = document.querySelector('.close');

// Configuration
const CONFIG = {
    DOTS_AMOUNT: 90,
    DOT_RADIUS: 30,
    GLOBE_SCALE: 0.5,
    BASE_SPEED: 0.002,
    HOVER_SPEED: 0.0005,
    HOVER_SCALE: 4,
    TRANSITION_SPEED: 0.1,
    LINE_DISTANCE: 130,
    LINE_WIDTH: 0.5
};

// Images array (update path as needed)
const IMAGES = [
    { src: 'images/vaevi.png', link: 'https://www.vaevi.com' },
];

let width, height, globeRadius, globeCenterZ, centerX, centerY, fieldOfView;
let rotationX = 0, rotationY = 0;
let dots = [];
let mouse = { x: 0, y: 0, clickX: null, clickY: null };
let currentSpeed = CONFIG.BASE_SPEED;
let targetSpeed = CONFIG.BASE_SPEED;
let anyDotHovered = false;
let isMouseOverCanvas = false;

// Preload images
const loadedImages = [];
Promise.all(IMAGES.map((img, i) => {
    return new Promise(resolve => {
        loadedImages[i] = new Image();
        loadedImages[i].src = img.src;
        loadedImages[i].onload = resolve;
    });
})).then(() => {
    init();
    animate();
}).catch(err => console.error('Image loading failed:', err));

function setCanvasDimensions() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    globeRadius = width * CONFIG.GLOBE_SCALE;
    globeCenterZ = -globeRadius;
    centerX = width / 2;
    centerY = height / 2;
    fieldOfView = width * 0.8;
}

class Dot {
    constructor(x, y, z, index) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.index = index;
        this.xProject = 0;
        this.yProject = 0;
        this.sizeProjection = 0;
        this.isHovered = false;
    }

    project(sinX, cosX, sinY, cosY) {
        const yRot = cosX * this.y - sinX * this.z;
        const zRotX = sinX * this.y + cosX * this.z;
        const zRotY = cosY * zRotX - sinY * this.x;
        const xRot = sinY * zRotX + cosY * this.x;

        this.sizeProjection = fieldOfView / (fieldOfView - zRotY);
        this.xProject = (xRot * this.sizeProjection) + centerX;
        this.yProject = (yRot * this.sizeProjection) + centerY;
    }

    checkInteraction(mouseX, mouseY) {
        if (!isMouseOverCanvas) return false;
        const dx = this.xProject - mouseX;
        const dy = this.yProject - mouseY;
        const radius = CONFIG.DOT_RADIUS * this.sizeProjection; // Use base radius for detection
        return Math.sqrt(dx * dx + dy * dy) < radius / 2;
    }

    draw() {
        const scale = this.isHovered ? CONFIG.HOVER_SCALE : 1;
        const size = CONFIG.DOT_RADIUS * this.sizeProjection * scale;
        
        if (this.isHovered) {
            anyDotHovered = true;
        }

        if (this.index < IMAGES.length && loadedImages[this.index]) {
            const img = loadedImages[this.index];
            const aspect = img.width / img.height;
            const baseSize = size * 2;
            const w = aspect > 1 ? baseSize : baseSize * aspect;
            const h = aspect > 1 ? baseSize / aspect : baseSize;
            
            ctx.drawImage(img, 
                this.xProject - w / 2, 
                this.yProject - h / 2, 
                w, h);
        } else {
            ctx.fillStyle = this.isHovered ? '#2B6CB0' : '#A3BFFA'; // CloudPhilos blue on hover, light blue default
            ctx.beginPath();
            ctx.arc(this.xProject, this.yProject, size / 2, 0, Math.PI * 2);
            ctx.fill();
            // Add subtle glow
            ctx.shadowColor = this.isHovered ? '#2B6CB0' : '#A3BFFA';
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        if (this.checkInteraction(mouse.clickX, mouse.clickY)) {
            if (this.index < IMAGES.length) {
                window.open(IMAGES[this.index].link, '_blank');
            } 
            mouse.clickX = null;
            mouse.clickY = null;
        }
    }
}

function createDots() {
    dots = [];
    for (let i = 0; i < CONFIG.DOTS_AMOUNT; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(Math.random() * 2 - 1);
        const x = globeRadius * Math.sin(phi) * Math.cos(theta);
        const y = globeRadius * Math.sin(phi) * Math.sin(theta);
        const z = globeRadius * Math.cos(phi) + globeCenterZ;
        dots.push(new Dot(x, y, z, i));
    }
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function drawLines() {
    ctx.lineWidth = CONFIG.LINE_WIDTH;
    
    for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
            const dot1 = dots[i];
            const dot2 = dots[j];
            
            const dx = dot1.xProject - dot2.xProject;
            const dy = dot1.yProject - dot2.yProject;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < CONFIG.LINE_DISTANCE * dot1.sizeProjection) {
                const gradient = ctx.createLinearGradient(
                    dot1.xProject, dot1.yProject,
                    dot2.xProject, dot2.yProject
                );
                gradient.addColorStop(0, '#CBD5E0'); // Light gray
                gradient.addColorStop(1, '#A3BFFA'); // Light blue
                
                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(dot1.xProject, dot1.yProject);
                ctx.lineTo(dot2.xProject, dot2.yProject);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    targetSpeed = anyDotHovered ? CONFIG.HOVER_SPEED : CONFIG.BASE_SPEED;
    currentSpeed = lerp(currentSpeed, targetSpeed, CONFIG.TRANSITION_SPEED);

    rotationX += currentSpeed;
    rotationY += currentSpeed;

    const sinX = Math.sin(rotationX);
    const cosX = Math.cos(rotationX);
    const sinY = Math.sin(rotationY);
    const cosY = Math.cos(rotationY);

    // Reset hover states
    dots.forEach(dot => {
        dot.isHovered = false;
    });

    // Find the closest dot to the mouse
    let closestDot = null;
    let closestDistance = Infinity;

    if (isMouseOverCanvas) {
        dots.forEach(dot => {
            dot.project(sinX, cosX, sinY, cosY); // Project dots first to get updated positions
            const dx = dot.xProject - mouse.x;
            const dy = dot.yProject - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = CONFIG.DOT_RADIUS * dot.sizeProjection;

            if (distance < radius / 2 && distance < closestDistance) {
                closestDistance = distance;
                closestDot = dot;
            }
        });
    }

    // Set the closest dot as hovered
    if (closestDot) {
        closestDot.isHovered = true;
    }

    anyDotHovered = closestDot !== null;

    // Project remaining dots and draw
    dots.forEach(dot => {
        if (!dot.isHovered) {
            dot.project(sinX, cosX, sinY, cosY);
        }
    });

    drawLines();
    dots.forEach(dot => {
        if (!dot.isHovered) {
            dot.draw();
        }
    });
    dots.forEach(dot => {
        if (dot.isHovered) {
            dot.draw();
        }
    });

    requestAnimationFrame(animate);
}

function init() {
    setCanvasDimensions();
    createDots();
}

// Event Listeners
window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        setCanvasDimensions();
        createDots();
    }, 250);
});

canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    isMouseOverCanvas = true;
});

canvas.addEventListener('click', e => {
    mouse.clickX = e.clientX;
    mouse.clickY = e.clientY;
});

canvas.addEventListener('mouseleave', () => {
    isMouseOverCanvas = false;
});

canvas.addEventListener('mouseenter', () => {
    isMouseOverCanvas = true;
});

// Modal close event
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Dynamically set the current year in the footer
document.getElementById('year').textContent = new Date().getFullYear();