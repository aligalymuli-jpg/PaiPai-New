/* js/config.js — Firebase Init */
'use strict';

const firebaseConfig = {
    apiKey:            'AIzaSyDU7Q6LOha4gIBz6HoHyx3Nx7LwWi4dSls',
    authDomain:        'ali1-717e6.firebaseapp.com',
    databaseURL:       'https://ali1-717e6-default-rtdb.firebaseio.com',
    projectId:         'ali1-717e6',
    storageBucket:     'ali1-717e6.firebasestorage.app',
    messagingSenderId: '293002535182',
    appId:             '1:293002535182:web:ac9be8c8ab5610e2e8375f',
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
