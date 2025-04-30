// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAtaf5eAkVjCmy4JzBSzoerR-cLRkD4GRM",
    authDomain: "social-work-placement.firebaseapp.com",
    projectId: "social-work-placement",
    storageBucket: "social-work-placement.firebasestorage.app",
    messagingSenderId: "465758786519",
    appId: "1:465758786519:web:04ae2f164411dbcf4bb192"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Drag to reorder
new Sortable(document.getElementById('soft-rules-list'), {
    animation: 150,
    onEnd: updatePriorityNumbers
});

function updatePriorityNumbers() {
    const badges = document.querySelectorAll('.priority-badge');
        badges.forEach((badge, index) => {
            badge.innerText = index + 1;
    });
}

// Save settings
function saveSettings() {
    const hardItems = document.querySelectorAll('#hard-rules-list li');
    const softItems = document.querySelectorAll('#soft-rules-list li');

    const hardRules = [];
    const softRules = [];

    hardItems.forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        hardRules.push({
            rule: item.dataset.rule,
            enabled: checkbox.checked
        });
    });

    softItems.forEach((item, index) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        softRules.push({
            rule: item.dataset.rule,
            enabled: checkbox.checked,
            priority: index + 1
        });
    });

    db.collection('matchingSettings').doc('currentSettings').set({
        timestamp: new Date(),
        hardRules: hardRules,
        softRules: softRules
    })
    .then(() => {
        alert('Settings saved successfully!');
    })
    .catch((error) => {
        console.error('Error saving settings: ', error);
        alert('Failed to save settings.');
    });
}
