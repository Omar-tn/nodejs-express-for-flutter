/*
const express =require('express');
// const mysql = require( 'mysql2');
const mysql = require('mysql2/promise');

*/
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors'; // if you're using CORS

const app = express();
const port = 3000;
// const cors = require('cors');
const router = express.Router();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

/*

const path = require("path");
const livereload = require("livereload");
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, 'public'));

*/

// const connectLivereload = require("connect-livereload");
// app.use(connectLivereload());
//
// liveReloadServer.server.once("connection", () => {
//     setTimeout(() => {
//         liveReloadServer.refresh("/");
//     }, 100);
// });

// async function connectDB() {
//     try {


const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',      // default XAMPP MySQL password is empty
    database: 'smart_campus'  // use your DB name

});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('MySQL Connected successfully');
});

/*        console.log('MySQL Connected');
        return db;
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
        throw err;
    }
}

// Initialize connection
let db;
connectDB()
    .then(connection => {
        db = connection;
        // Start your server or continue with app setup
    })
    .catch(err => {
        console.error('Failed to connect to database:', err);
        process.exit(1); // Exit if DB connection fails
    });

*/

/*db.then(con => {
    console.log('MySQL Connected');
     db = con;

}).catch(err => {
        if (err) throw err;

        console.log('MySQL Connection Error: ', err);
});*/

//delete requests ////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.delete('/partners/request/:id', async (req, res) => {
    const {id} = req.params;

    try {
        // Execute a query to delete the partner request by ID
        const [result] = await db.query('DELETE FROM student_partners WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            // If no rows were affected, the request was not found
            return res.status(404).json({
                status: 'error',
                message: 'Partner request not found',
            });
        }

        // Success response
        res.status(200).json({
            status: 'success',
            message: 'Partner request deleted successfully',
        });
    } catch (error) {
        // Handle errors
        console.error('Error deleting partner request:', error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while deleting the partner request',
        });
    }
});


//get requests //////////////////////////////////////////////////////////////////////////////////////////////////////////


app.get('/', async (req, res) => {

    try {
        const [results] = await db.query('SELECT * FROM students');
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
});

app.get('/coursesAnnounced', async (req, res) => {
    const studentId = req.params.id;
    try {
        const [results] = await db.query('SELECT * FROM `courses_announce` WHERE 1');
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
});

app.get('/partners/available', async (req, res) => {
    const uid = req.query.uid;

    try {
        let project = req.query.project;

// Check if user has confirmed partners for the subject
        const [confirmedPartners] = await db.query(
            `SELECT s.name, s.email, s.firebase_uid, sp.id, sp.subject, sp.status
             FROM students s,
                  student_partners sp
             WHERE (s.firebase_uid = sp.partner_1 OR s.firebase_uid = sp.partner_2)
               AND (sp.partner_1 = ? OR sp.partner_2 = ?)
               and s.firebase_uid != ?
              AND sp.status = 'confirmed'
             ORDER BY sp.subject ASC;`,

            [uid, uid, uid] // Use uid for all three placeholders
        );


        if (confirmedPartners.length >= 2) {
            // Return confirmed partner if exists
            return res.json({
                msg: "full",
                confirmed: confirmedPartners,

            });
        }

        let msg = "none", other = "", query = "";
        if (confirmedPartners.length === 1) {
            if (confirmedPartners[0].subject === "GP1") {
                msg = "GP1";
                other = "GP2";
                query = `SELECT name, email, firebase_uid, subject
                         FROM students,
                              student_partners
                         WHERE firebase_uid != ? 
             AND firebase_uid = partner_1 
             AND status = 'pending' 
             AND subject = 'GP2'
             AND firebase_uid NOT IN (
             SELECT partner_2 
             FROM student_partners 
             WHERE partner_1 = ? 
             AND partner_2 IS NOT NULL 
             AND subject IS NOT NULL
             ) `;

            } else if (confirmedPartners[0].subject === "GP2") {
                msg = "GP2";
                other = "GP1";
                query = `SELECT name, email, firebase_uid, subject
                         FROM students,
                              student_partners
                         WHERE firebase_uid != ? 
             AND firebase_uid = partner_1 
             AND status = 'pending' 
             AND subject = 'GP1'
             AND firebase_uid NOT IN (
             SELECT partner_2 
             FROM student_partners 
             WHERE partner_1 = ? 
             AND partner_2 IS NOT NULL 
             AND subject IS NOT NULL
            ) `;
            }


        } else if (confirmedPartners.length === 0) {
            msg = "none";
            query = `SELECT name, email, firebase_uid, subject
                     FROM students,
                          student_partners
                     WHERE firebase_uid != ?
                AND firebase_uid = partner_1
            AND status = 'pending'
            AND firebase_uid NOT IN (
                SELECT partner_2
            FROM student_partners
            WHERE partner_1 = ?
                AND partner_2 IS NOT NULL
            AND subject IS NOT NULL
        )`;
        }


        // Get available partners if no confirmed ones


        const [rows] = await db.query(
            query,
            [uid, uid, other]
        );
        res.json({
            msg: msg,
            confirmed: confirmedPartners,
            available: rows
        });
    } catch (err) {
        res.status(500).send('Error fetching partners: ' + err.message);
    }
});


app.get('/partners/requests', async (req, res) => {
    const uid = req.query.uid;

    if (!uid) {
        return res.status(400).json({error: 'User ID is required'});
    }

    try {
        const [partnerRequests] = await db.query(
            `SELECT sp.id, sp.partner_1, sp.subject, sp.status, s.name AS partner_name, s.email AS partner_email
             FROM student_partners sp
                      JOIN students s ON sp.partner_1 = s.firebase_uid
             WHERE sp.partner_2 = ?
               AND sp.status = 'pending'
             ORDER BY sp.subject`,
            [uid]
        );

        res.status(200).json(partnerRequests || []);
    } catch (err) {
        console.error('Error fetching partner requests:', err);
        res.status(500).json({error: 'Error fetching partner requests'});
    }

});


app.get('/partners/search', async (req, res) => {
    const {uid, subject, field, text} = req.query;

    if (!subject || !field || !text) {
        return res.status(400).json({error: 'Missing query parameters'});
    }

    try {
        // Sanitize field to prevent SQL injection (allow only specific fields)
        const allowedFields = ['name', 'firebase_uid'];
        /*if (!allowedFields.includes(field)) {
            return res.status(400).json({ error: 'Invalid search field' });
        }*/
        //check if user has confirmed partners for the subject
        const [hasPartner] = await db.query(
            `SELECT *
             FROM student_partners
             WHERE (partner_1 = ? OR partner_2 = ?)
               AND subject = ?
               AND status = 'confirmed'`,
            [uid, uid, subject]
        );

        if (hasPartner.length > 0) {
            return res.status(500).json({
                message: 'User already has a partner for this subject.',
                hasPartner: true,
                results: []
            });
        }


        const [results] = await db.query(
            `SELECT *
             FROM students
             WHERE ${field} LIKE ?
               AND firebase_uid NOT IN (SELECT partner_2
                                        FROM student_partners
                                        WHERE partner_1 = ? AND subject = ?)`,
            [`%${text}%`, uid, subject]
        ); // The text variable should be `` for LIKE query if you intend partial matches
        res.status(200).json(results);
    } catch (err) {
        console.error('Error searching students:', err);
        res.status(500).json({error: 'Error searching students'});
    }
});


// Get user's current partners
app.get('/partners', async (req, res) => {
    const uid = req.query.uid;

    try {
        const [partners] = await db.query(
            `SELECT s.name, s.email, s.firebase_uid, sp.subject, sp.status 
             FROM students s 
             JOIN student_partners sp ON (s.firebase_uid = sp.partner_1 OR s.firebase_uid = sp.partner_2)
             WHERE (sp.partner_1 = ? OR sp.partner_2 = ?) 
             AND s.firebase_uid != ?
             AND sp.status = 'confirmed'`,
            [uid, uid, uid]
        );
        res.json(partners);
    } catch (err) {
        res.status(500).send('Error fetching partners: ' + err.message);
    }
});

// Get available partners for groups
app.get('/partners/available/subject', async (req, res) => {
    const {uid, subject} = req.query;

    try {
        const [available] = await db.query(
            `SELECT s.* FROM students s
             WHERE s.firebase_uid != ?
             AND s.firebase_uid NOT IN (
                 SELECT partner_2 FROM student_partners
                 WHERE partner_1 = ? AND subject = ?
             )`,
            [uid, uid, subject]
        );
        res.json(available);
    } catch (err) {
        res.status(500).send('Error fetching available partners: ' + err.message);
    }
});

// Get pending partner requests
app.get('/partners/pending', async (req, res) => {
    const uid = req.query.uid;

    try {
        const [pending] = await db.query(
            `SELECT sp.*, s.name, s.email
             FROM student_partners sp
             JOIN students s ON sp.partner_1 = s.firebase_uid
             WHERE sp.partner_2 = ?
             AND sp.status = 'pending'`,
            [uid]
        );
        res.json(pending);
    } catch (err) {
        res.status(500).send('Error fetching pending requests: ' + err.message);
    }
});

// Search for potential partners
app.get('/partners/search/name', async (req, res) => {
    const {uid, query} = req.query;

    try {
        const [results] = await db.query(
            `SELECT s.* FROM students s
             WHERE s.name LIKE ?
             AND s.firebase_uid != ?`,
            [`%${query}%`, uid]
        );
        res.json(results);
    } catch (err) {
        res.status(500).send('Error searching partners: ' + err.message);
    }
});


// Get user's confirmed partnerships
app.get('/user/partnerships', async (req, res) => {
    const uid = req.query.uid;

    if (!uid) {
        return res.status(400).json({error: 'User ID is required'});
    }

    try {
        const [partnerships] = await db.query(
            `SELECT * FROM student_partners 
             WHERE (partner_1 = ? OR partner_2 = ?)
             AND status = 'confirmed'`,
            [uid, uid]
        );
        res.status(200).json(partnerships);
    } catch (err) {
        console.error('Error fetching partnerships:', err);
        res.status(500).json({error: 'Error fetching partnerships'});
    }
});


//post requests ////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.post('/requestSection', (req, res) => {
    db.query('INSERT INTO `feedback`( `student_id`, `message`) VALUES (\'12xxxxxx\',\'backend test msg after page\')', (err, result) => {

        if (err) {
            console.error('Query error:', err);
            return res.status(500).json({error: 'Database error'});
        }
        console.log(result);
        res.status(200).json({res: 'success!'});

    });
});


app.post('/courses_announce/:id/enroll', async (req, res) => {
    const courseId = req.params.id;
    const {student_id} = req.body;

    try {
        const [check] = await db.query(
            'SELECT * FROM course_enrollments WHERE student_uid = ? AND course_id = ?',
            [student_id, courseId]
        );
        if (check.length > 0) return res.status(400).send('Already enrolled');

        //check if participants = max_participants
        const [course] = await db.query(
            'SELECT * FROM courses_announce WHERE id = ?',
            [courseId]
        );
        if (!course[0].max_participants) // if max_participants is 0 then no limit on participants, so allow enrollment
            ; // return res.status(400).send('This course has no participant limit');

        else if (course[0].participants >= course[0].max_participants)
            return res.status(400).send('Course is full');


        await db.query(
            'INSERT INTO course_enrollments (student_uid, course_id) VALUES (?, ?)',
            [student_id, courseId]
        );

        await db.query(
            'UPDATE courses_announce SET participants = participants + 1 WHERE id = ?',
            [courseId]
        );

        res.send('Enrolled successfully');
    } catch (err) {
        res.status(500).send('Enrollment failed ' + err.message);
    }
});


app.post('/courses_announce/:id/vote', async (req, res) => {
    const courseId = req.params.id;
    const {student_id} = req.body;

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
        res.status(500).json({success: false, message: 'Voting failed', error: err.message});
        console.log(err);
    }
});

app.post('/feedback', async (req, res) => {
    const {student_id, feedback_text} = req.body;
    if (!student_id || !feedback_text) return res.status(400).send('Missing fields');

    try {
        await db.query(
            'INSERT INTO feedback (student_id, feedback_text, submitted_at) VALUES (?, ?, NOW())',
            [student_id, feedback_text]
        );
        res.send('Feedback saved');
    } catch (err) {
        res.status(500).send('Error saving feedback');
    }
});


// POST request to partner
app.post('/partners/request', async (req, res) => {
    const {from_id, to_id, subject} = req.body;

    // Validate required fields
    if (!from_id || !subject) {
        return res.status(400).send('Missing required fields');
    }

    var  p2 = to_id.trim(); // If to_id is not provided, set it to an empty string
    p2 = p2.trim();


    console.log(!!p2);
    var p = p2 ? '= ' + p2 : 'is null'; // If to_id is not provided, set it to 'is null' for the query

    // Prevent self-partnering
    if (from_id === p2) {
        return res.status(400).send('Cannot partner with yourself');
    }

    try {


        // Check for existing request from either direction
        const [existingRequests] = await db.query(
            `SELECT *
             FROM student_partners
             WHERE (partner_1 = ? AND partner_2 ${p})
               AND subject = ? `,
            [from_id, subject]
        );


        if (existingRequests.length > 0) {
            let q = p2 ? 'A partnership request already exists between these users for this subject' : 'a public request already exists for this subject';

            return res.status(400).send(q);
        }

        let v = p2 ? p2 : null; // If to_id is not provided, set it to 'null' for the query

        await db.query(
            'INSERT INTO student_partners (partner_1, partner_2, subject, status) VALUES (?, ?, ?, ?)',
            [from_id, v, subject, 'pending']
        );
        res.send('Request sent');
    } catch (err) {
        res.status(500).send('Request failed' + err.message);
    }
});

// API to handle partner request actions
app.post('/partners/requests/action', async (req, res) => {
    const {request_id, action} = req.body;

    if (!request_id || !action) {
        return res.status(400).send('Missing fields');
    }

    if (action !== 'accept' && action !== 'reject') {
        return res.status(400).send('Invalid action. Must be "accept" or "reject".');
    }

    try {
        // Get the partner request details
        const [request] = await db.query(
            'SELECT * FROM student_partners WHERE id = ? AND status = "pending"',
            [request_id]
        );

        if (request.length === 0) {
            return res.status(404).send('Request not found or already processed.');
        }
        // Check if the receiver is already have a partner for the subject
        const [existingPartner] = await db.query(
            'SELECT * FROM student_partners WHERE (partner_1 = ? OR partner_2 = ?) AND subject = ? AND status = "confirmed"',
            [request[0].partner_2,request[0].partner_2, request[0].subject]
        );
        if (existingPartner.length > 0) {
            return res.status(400).send('You already have a partner for this subject.');

        }

        if (action === 'accept') {
            // Update the request to accepted
            await db.query(
                'UPDATE student_partners SET status = "confirmed" WHERE id = ?',
                [request_id]
            );

            // delete all pinding requests for the same subject for the receiver
            await db.query(
                'DELETE FROM student_partners WHERE partner_1 = ? AND subject = ? AND status = "pending"',
                [request[0].partner_2, request[0].subject]
            );

        } else if (action === 'reject') {
            // Update the request to rejected
            await db.query(
                'UPDATE student_partners SET status = "rejected" WHERE id = ?',
                [request_id]
            );

            // Optionally, delete the request
            await db.query(
                'DELETE FROM student_partners WHERE id = ?',
                [request_id]
            );


        }

        res.status(200).send(`Request ${action}ed successfully`);
    } catch (err) {
        console.error('Error processing partner request action:', err);
        res.status(500).send('Error processing partner request action');
    }
});


app.listen(port, () => {
    console.log(`Server  running on http://localhost:${port}`);
});


// module.exports = router;