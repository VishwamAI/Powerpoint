const slideTemplates = [
    {
        name: 'Title Slide',
        content: `
            <div class="slide-title">
                <h1 contenteditable="true">Presentation Title</h1>
                <h2 contenteditable="true">Subtitle</h2>
            </div>
        `
    },
    {
        name: 'Content Slide',
        content: `
            <div class="slide-content">
                <h2 contenteditable="true">Slide Title</h2>
                <p contenteditable="true">Your content goes here...</p>
            </div>
        `
    },
    {
        name: 'Image Slide',
        content: `
            <div class="slide-image">
                <h2 contenteditable="true">Slide Title</h2>
                <img src="path/to/your/image.jpg" alt="Image" contenteditable="true">
                <p contenteditable="true">Image description...</p>
            </div>
        `
    },
    {
        name: 'Chart Slide',
        content: `
            <div class="slide-chart">
                <h2 contenteditable="true">Slide Title</h2>
                <canvas id="chartCanvas" contenteditable="true"></canvas>
                <p contenteditable="true">Chart description...</p>
            </div>
        `
    },
    {
        name: 'Conclusion Slide',
        content: `
            <div class="slide-conclusion">
                <h2 contenteditable="true">Conclusion</h2>
                <p contenteditable="true">Summary of key points...</p>
            </div>
        `
    }
];

module.exports = slideTemplates;
