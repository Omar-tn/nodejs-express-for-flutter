/*const express = require('express');
const mysql = require('mysql2/promise');
const app = express();*/
const port = 3000;

import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors'; // if you're using CORS
const app = express();
app.use(express.json());
app.use(cors());
// Define db variable in the global scope
let db;

// Connect to DB and start server only after connection is established
async function startServer() {
    try {
        // Connect to database
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'smart_campus'
        });

        console.log('MySQL Connected');

        // Define routes AFTER db connection is established
        setupRoutes();

        // Start the server AFTER DB connection is established
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });

    } catch (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1); // Exit if DB connection fails
    }
}

// Set up routes
function setupRoutes() {
    app.get('/', async (req, res) => {
        try {
            // mysql2/promise returns results as [rows, fields]
            const [results] = await db.query('SELECT * FROM students');
            res.json(results);
        } catch (err) {
            console.error('Query error:', err);
            res.status(500).json({ error: 'Database error' });
        }
    });

    app.get('/requestSection', async (req, res) => {
        try {
            const [result] = await db.query('INSERT INTO `feedback`(`student_id`, `message`) VALUES (\'2\',\'backend test msg\')');
            res.json(result);
        } catch (err) {
            console.error('Query error:', err);
            res.status(500).json({ error: 'Database error' });
        }
    });


    app.post('/courses_announce/:id/vote', async (req, res) => {
        const courseId = req.params.id;
        const { student_id } = req.body;

        try {
            const [check] = await db.query(
                'SELECT * FROM course_votes WHERE student_id = ? AND course_id = ?',
                [student_id, courseId]
            );
            if (check.length > 0) return res.status(400).send('Already voted');

            await db.query(
                'INSERT INTO course_votes (student_id, course_id) VALUES (?, ?)',
                [student_id, courseId]
            );

            await db.query(
                'UPDATE courses_announce SET votes = votes + 1 WHERE id = ?',
                [courseId]
            );

            res.send('Vote recorded');
        } catch (err) {
            res.status(500).json({ success: false, message: 'Voting failed', error: err.message });
            console.log(err);
        }
    });

}

// Start server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});