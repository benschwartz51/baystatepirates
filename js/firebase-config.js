// Firebase configuration for Bay State Pirates
var firebaseConfig = {
    apiKey: "AIzaSyAaGuazJ1g6xVBzlY3LQRr0ZjaC7rZvTRk",
    authDomain: "bay-state-pirates.firebaseapp.com",
    databaseURL: "https://bay-state-pirates-default-rtdb.firebaseio.com",
    projectId: "bay-state-pirates",
    storageBucket: "bay-state-pirates.firebasestorage.app",
    messagingSenderId: "16139176558",
    appId: "1:16139176558:web:4a4e9a9a2a43470468f47f"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();
