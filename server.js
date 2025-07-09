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

//delete course announce
app.delete('/courses_announce/delete', async (req, res) => {
    const {courseId} = req.body;

    try {
        // Check if the course exists
        const [course] = await db.query('SELECT * FROM courses_announce WHERE id = ?', [courseId]);
        if (course.length === 0) {
            return res.status(404).send('Course not found');
        }

        // Delete the course announcement
        await db.query('DELETE FROM courses_announce WHERE id = ?', [courseId]);

        res.status(200).send('Course announcement deleted successfully');
    } catch (err) {
        console.error('Error deleting course announcement:', err);
        res.status(500).send('Error deleting course announcement: ' + err.message);
    }
});

// Delete all announcements and course announcements
app.delete('/announcements/deleteAll', async (req, res) => {
    try {
        await db.query('DELETE FROM announcements');
        await db.query('DELETE FROM courses_announce');
        res.status(200).send('All announcements deleted successfully');
    } catch (err) {
        console.error('Error deleting all announcements:', err);
        res.status(500).send('Error deleting all announcements: ' + err.message);
    }
});

// Helper function to determine current semester
function getCurrentSemester() {
    const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11
    if (currentMonth >= 9 && currentMonth <= 12) {
        return 'Fall';
    } else if (currentMonth >= 1 && currentMonth <= 5) {
        return 'Spring';
    } else {
        return 'Summer';
    }
}

// Insert new semester announcements
app.post('/announcements/newSemester', async (req, res) => {

    const uid = req.body.uid; // Assuming uid is passed in the request body

    try {
        const semester = getCurrentSemester();
        const currentYear = new Date().getFullYear();

        // Insert semester start announcement
        await db.query(
            'INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)',
            [
                `${semester} ${currentYear} Semester Start`,
                `Welcome to the ${semester} ${currentYear} semester! Check course announcements for available sections.`,
                uid
            ]
        );

        res.status(200).send('New semester announcements created successfully');
    } catch (err) {
        console.error('Error creating new semester announcements:', err);
        res.status(500).send('Error creating new semester announcements: ' + err.message);
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

app.get('/getRole', async (req, res) => {
    const uid = req.query.uid;

    if (!uid) {
        return res.status(400).json({error: 'User ID is required'});
    }

    try {
        const [results] = await db.query(
            'SELECT * FROM user WHERE uid = ?'
            , [uid]);
        if (results.length === 0) {
            return res.status(404).json({error: 'User not found'});
        }
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
});

//*******************************8

app.post('/register_user', async (req, res) => {

    const {name, email, uid, role, id} = req.body;

    if (!email || !uid || !role) {
        return res.status(400).json({error: 'All fields are required'});
    }


    try {


        // Check if user ID is provided


        if (role === 'student') {


            // Check if user already exists
            const [existingUser] = await db.query(
                'SELECT * FROM students WHERE firebase_uid = ?'
                , [id]);
            if (existingUser.length > 0) {

                return res.status(400).json({error: 'User already exists'});
            }

            // Insert new user
            const [result] = await db.query(
                'INSERT INTO students (name, email, firebase_uid) VALUES (?, ?, ?)',
                [name, email, id]
            );
            if (result.affectedRows === 0) {

                return res.status(500).json({error: 'Failed to register student'});
            }

            const [ins] = await db.query(
                'INSERT INTO user (id, email, uid, role) VALUES (?, ?, ?, ?)',
                [id, email, uid, role]
            );
            if (ins.affectedRows === 0) {

                return res.status(500).json({error: 'Failed to register user'});
            }

            console.log(result);

            return res.status(200).json({message: 'Student registered successfully', userId: result.insertId});


        } else if (role === 'admin') {
            // Check if user already exists
            const [existingUser] = await db.query('SELECT * FROM staff WHERE firebase_uid = ?'
                , [id]);
            if (existingUser.length > 0) {
                return res.status(400).json({error: 'User already exists'});
            }

            // Insert new user
            const [result] = await db.query(
                'INSERT INTO staff (name, email, firebase_uid, role) VALUES (?, ?, ?, ?)',
                [name, email, id, role]
            );

            if (result.affectedRows === 0) {

                return res.status(500).json({error: 'Failed to register admin'});

            }

            const [ins] = await db.query(
                'INSERT INTO user (id, email, uid, role) VALUES (?, ?, ?, ?)',
                [id, email, uid, role]
            );
            if (ins.affectedRows === 0) {
                return res.status(500).json({error: 'Failed to register user'});
            }

            return res.status(200).json({message: 'Admin registered successfully', userId: result.insertId});


        } else {
            // Invalid role
            return res.status(400).json({error: 'Invalid role'});
        }


    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({error: 'Database error'});
    }
});


//***************************8
app.get('/announcements', async (req, res) => {

    try {
        const [results] = await db.query(
            'SELECT DATE_FORMAT(created_at, \'%Y-%m-%d %H:%i\') as time , body ,title FROM announcements ORDER BY time DESC');
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }

});



app.get('/courses', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM course');
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
});


app.get('/coursesAnnounced', async (req, res) => {
    const studentId = req.params.id;
    try {
        const [results] = await db.query(
            'SELECT title, description, a.* FROM `courses_announce` a, course c WHERE a.course_id = c.id');
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
});

// get announced courses only
app.get('/coursesAnnounced/only', async (req, res) => {
    try {
        const [results] = await db.query('SELECT title, description, a.* FROM `courses_announce` a, course c WHERE a.course_id = c.id and type = "announce"');
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
});


app.get('/coursesAnnounced/percent', async (req, res) => {

    try {
        const [results] = await db.query('SELECT * FROM `course` WHERE type = "announce"');

        // Calculate the percentage of participants in all  courses
        const totalCourses = results.length;
        if (totalCourses === 0) {
            return res.send('percentage: 0.0%');
        }
        //for (var c in _announcedCourses.where((course) => course['type'] == 'announce')) {
        //
        //         count++;
        //         int most= (c['participants'] ?? 0) > (c['votes'] ?? 0) ? c['participants'] as int : c['votes'] as int;
        //         mosts += most;
        //
        //          maxs+= c['max_participants'] != null ? c['max_participants'] as int : most ;
        //           percent = most / maxs * 100;
        //
        //
        //     }
        //
        //     percent = count == 0 ? 0 : (mosts / maxs * 100);
        let totalPercents = 0;
        let totalVotes = 0;
        let totalMaxParticipants = 0;
        var mst = 0;
        for (const course of results) {
            mst = course.participants > course.votes ? course.participants : course.votes;
            totalVotes += course.votes || 0;
            totalMaxParticipants += course.max_participants > 0 ? course.max_participants : most; // Handle null values
        }
        totalMaxParticipants *= totalCourses;
        const percent = totalMaxParticipants > 0 ? (totalPercents / totalMaxParticipants) * 100 : 0;

        res.send(percent.toFixed(2) + '%');

    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});

    }
});

// get courses offcial
app.get('/courses/official', async (req, res) => {
    try {
        const [results] = await db.query('SELECT c.*, ca.ID, ca.time  ' +
            'FROM courses_announce ca , course c ' +
            'WHERE type = "official"' +
            ' AND ca.course_id = c.id');
        res.json(results);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
});


app.get('/userData', async (req, res) => {
    const uid = req.query.uid;

    if (!uid) {
        return res.status(400).json({error: 'User ID is required'});
    }

    try {
        const [results] = await db.query(
            'SELECT s.* ' +
            'FROM user u , students s ' +
            ' WHERE u.uid = ? ' +
            'and u.id = s.firebase_uid',
            [uid]
        );
        if (results.length === 0) {
            return res.status(404).json({error: 'User not found'});
        }
        res.json(results[0]);
    } catch (err) {
        console.error('Query error:', err);
        return res.status(500).json({error: 'Database error'});
    }
})


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
             and partner_2 IS NULL
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
                and partner_2 IS NULL
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
                                        WHERE partner_1 = ?
                                          AND subject = ?
                                          AND partner_2 IS NOT NULL)`,
            [`%${text}%`, uid, subject]
        ); // The text variable should be `` for LIKE query if you intend partial matches
        res.status(200).json(results);
        console.log(results)
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
            `SELECT s.*
             FROM students s
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
            `SELECT s.*
             FROM students s
             WHERE s.name LIKE ?
               AND s.firebase_uid != ?`,
            [`%${query}%`, uid]
        );
        res.json(results);
    } catch (err) {
        res.status(500).send('Error searching partners: ' + err.message);
    }
});

// get course announcements
app.get('/courses_announce', async (req, res) => {
    try {
        const [announcements] = await db.query(
            'SELECT ca.*, c.title, c.description ' +
            'FROM courses_announce ca ' +
            'JOIN course c ON ca.course_id = c.id'
        );
        res.status(200).json(announcements);
    } catch (err) {
        console.error('Error fetching course announcements:', err);
        res.status(500).json({error: 'Error fetching course announcements'});
    }

});


app.get('/api/course-requests', async (req, res) => {
    try {
        const [requests] = await db.query('SELECT c.*, ca.ID, ca.time, ca.Participants ,ca.max_participants, s.name , s.firebase_uid, cc.title  ' +
            'FROM course_requests c, students s, course cc , courses_announce ca ' +
            'WHERE c.userId = s.firebase_uid' +
            ' AND c.courseId = ca.id' +
            ' AND ca.course_id = cc.id');
        res.status(200).json(requests);
    } catch (err) {
        console.error('Error fetching course requests:', err);
        res.status(500).json({error: 'Error fetching course requests'});
    }
});

// Get user's course enrollments
app.get('/api/course-students', async (req, res) => {
    const courseId = req.query.courseId;

    if (!courseId) {
        return res.status(400).json({error: 'User ID is required'});
    }

    try {
        const [enrollments] = await db.query(
            `SELECT s.*, c.title, c.description
             FROM course_enrollments ce
                      JOIN courses_announce ca ON ce.course_id = ca.id
                      JOIN course c ON ca.course_id = c.id
                      JOIN students s ON ce.student_uid = s.firebase_uid
             WHERE ce.course_id = ?`,
            [courseId]
        );
        res.status(200).json(enrollments);
    } catch (err) {
        console.error('Error fetching course enrollments:', err);
        res.status(500).json({error: 'Error fetching course enrollments'});
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
            `SELECT *
             FROM student_partners
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


//supervisor endpoints //////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/supervisor/requests', async (req, res) => {
    const supervisorId = req.query.supervisorId;
    const subject = req.query.subject;

    try {
        let query = `
            SELECT sr.*,
                   s.name          as name1,
                   s2.name         as name2,
                   s.email         as email1,
                   s2.email        as email2,
                   s.firebase_uid  as id1,
                   s2.firebase_uid as id2
            FROM supervisor_requests sr
                     JOIN student_partners sp ON sr.partnership_id = sp.id
                     JOIN students s ON sp.partner_1 = s.firebase_uid
                     JOIN students s2 ON sp.partner_2 = s2.firebase_uid
            WHERE sr.supervisor_id = ?
              and sr.subject = ?
            order by sr.status asc`;

        const queryParams = [supervisorId, subject];


        const [requests] = await db.query(query, queryParams);
        res.status(200).json(requests);
    } catch (err) {
        console.error('Error fetching supervision requests:', err);
        res.status(500).json({error: 'Error fetching supervision requests'});
    }
});


// Get supervision requests for a specific supervisor
app.get('/supervisor/:supervisorId/requests', async (req, res) => {
    const {supervisorId} = req.params;
    const {status} = req.query;

    try {
        let query = `
            SELECT sr.*,
                   s.name          as name1,
                   s2.name         as name2,
                   s.email         as email1,
                   s2.email        as email2,
                   s.firebase_uid  as id1,
                   s2.firebase_uid as id2
            FROM supervisor_requests sr
                     JOIN student_partners sp ON sr.partnership_id = sp.id
                     JOIN students s ON sp.partner_1 = s.firebase_uid
                     JOIN students s2 ON sp.partner_2 = s.firebase_uid
            WHERE sr.supervisor_id = ?`;

        const queryParams = [supervisorId];

        if (status) {
            query += ' AND sr.status = ?';
            queryParams.push(status);
        }

        const [requests] = await db.query(query, queryParams);
        res.status(200).json(requests);
    } catch (err) {
        console.error('Error fetching supervision requests:', err);
        res.status(500).json({error: 'Error fetching supervision requests'});
    }
});

// Get all supervisors

app.get('/supervisors', async (req, res) => {
    try {
        const [supervisors] = await db.query('SELECT * FROM staff WHERE role = "supervisor"');
        res.status(200).json(supervisors);
    } catch (err) {
        console.error('Error fetching supervisors:', err);
        res.status(500).json({error: 'Error fetching supervisors'});
    }
});

app.get('/supervisorsOf', async (req, res) => {
    const {uid} = req.query;

    try {
        //getting supervisors of a specific user from supervisor_requests table and its supervisor details
        const [supervisors] = await db.query(`
            SELECT s.name, s.email, s.firebase_uid, sr.subject, sr.status
            FROM supervisor_requests sr 
            JOIN staff s ON sr.supervisor_id = s.firebase_uid
            WHERE sr.partnership_id   IN (
                SELECT id  FROM student_partners WHERE (partner_1 = ? OR partner_2 = ?)
                   
            )
              and sr.status = 'approved'
            ORDER BY sr.subject
        `, [uid, uid]);


        res.status(200).json(supervisors);
    } catch (err) {
        console.error('Error fetching supervisors:', err);
        res.status(500).json({error: 'Error fetching supervisors'});
    }
});

app.get('/projects', async (req, res) => {

    try {
        const [projects] = await db.query('SELECT * ' +
            'FROM supervisor_requests ');
        res.status(200).json(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({error: 'Error fetching projects'});
    }

});

app.get('/groups/active', async (req, res) => {


    try {
        const [groups] = await db.query(
            `SELECT *
             FROM student_partners 
             WHERE  status = 'confirmed'`,
        );
        res.status(200).json(groups);
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).json({error: 'Error fetching groups'});
    }

});




///////////////get requests ////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////put requests ////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.put('/api/course-requests/:requestId', async (req, res) => {
    const {requestId} = req.params;
    const {type, status} = req.body;

    if (!requestId || !status) {
        return res.status(400).json({error: 'Request ID and status are required'});
    }

    try {

        // Get request details
        const [request] = await db.query(
            'SELECT * FROM course_requests WHERE id = ?',
            [requestId]
        );

        if (request.length === 0) {
            return res.status(404).json({error: 'Request not found'});
        }

        if (type === 'enroll' && status === 'approved') {
            // Add to course enrollments
            await db.query(
                'INSERT INTO course_enrollments (student_uid, course_id) VALUES (?, ?)',
                [request[0].userId, request[0].courseId]
            );

            // Update course participants count
            await db.query(
                'UPDATE courses_announce SET participants = participants + 1 WHERE id = ?',
                [request[0].courseId]
            );
        }

        if (type === 'withdraw' && status === 'approved') {

            //check if the user is enrolled in the course
            const [enrollmentCheck] = await db.query(
                'SELECT * FROM course_enrollments WHERE student_uid = ? AND course_id = ?',
                [request[0].userId, request[0].courseId]
            );
            if (enrollmentCheck.length === 0) {
                return res.status(404).send('User is not enrolled in this course');

            }


            // Remove from course enrollments
            await db.query(
                'DELETE FROM course_enrollments WHERE student_uid = ? AND course_id = ?',
                [request[0].userId, request[0].courseId]
            );

            // Update course participants count
            await db.query(
                'UPDATE courses_announce SET participants = participants - 1 WHERE id = ?',
                [request[0].courseId]
            );

        }


        // Delete the request
        await db.query(
            'DELETE FROM course_requests WHERE id = ?',
            [requestId]
        );

        //TODO: send notification to user
        // Respond with success message


        res.status(200).json({message: `Request ${status} successfully`});
    } catch (err) {
        console.error('Error processing course request:', err);
        res.status(500).json({error: 'Error processing course request'});
    }
});


/////////put requests ////////////////////////////////////////////////////////////////////////////////////////////////////////////


//post requests ////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.post('/requestSection', async (req, res) => {

    const {user_id, course, type, details} = req.body;

    if (!user_id || !course || !type) {
        return res.status(400).send('Missing required fields');
    }
    var d = details ?? ''; // If details is not provided, set it to a default value

    try {
        console.log(user_id, course, type, d);
        const [check] = await db.query(
            'SELECT * FROM course_requests WHERE userId = ? AND courseId = ?',
            [user_id, course]
        );
        if (check.length > 0) {

            return res.status(400).send('Request already exists for this course');

        }

        if (type === 'Withdraw') {
            // Check if the user is enrolled in the course
            const [enrollmentCheck] = await db.query(
                'SELECT * FROM course_enrollments WHERE student_uid = ? AND course_id = ?',
                [user_id, course]
            );
            if (enrollmentCheck.length === 0) {
                return res.status(404).send('User is not enrolled in this course');
            }


        }
        // Check if the user is already enrolled in the course
        if (type === 'Enroll') {

            const [enrollmentCheck] = await db.query(
                'SELECT * FROM course_enrollments WHERE student_uid = ? AND course_id = ?',
                [user_id, course]
            );
            if (enrollmentCheck.length > 0) {
                return res.status(400).send('User is already enrolled in this course');
            }
        }

        if (type === 'Request information') {
            // Check if the user has already requested information for this course
            /*const [infoCheck] = db.query(
                'SELECT * FROM course_requests WHERE userId = ? AND courseId = ? AND type = ?',
                [user_id, course, type]
            );
            if (infoCheck.length > 0) {
                return res.status(400).send('Information request already exists for this course');
            }
            */
            //TODO: Add notification to user


        }


        const [insert] = await db.query(
            'INSERT INTO course_requests (courseId, userId, type, reason) VALUES (?, ?, ?, ?)',
            [course, user_id, type, d],
        );
        if (insert.affectedRows === 0) {
            return res.status(500).send('Failed to create request');

        }

        res.status(200).send('Request created successfully');

    } catch (err) {
        console.error('Error creating course request:', err);
        return res.status(500).send('Error creating course request: ' + err.message);
    }


});
app.post('/courses_announce', async (req, res) => {

    const {courseId, id, time, max_participants} = req.body;


    //REPLACE: Replace with actual staff ID


    try {
        //get course details
        const [courseDetails] = await db.query(
            'SELECT * FROM course WHERE id = ?',
            [courseId]
        );
        if (courseDetails.length === 0) {
            return res.status(404).send('Course not found');
        }

        let query = 'insert into courses_announce (course_id,time,created_by, type,  max_participants) values (?, ?, ?,?,?)';
        let parm = [courseId, time, id, 'announce', max_participants,];

        //check if time null and max_participants null
        if (!time && !max_participants) {
            query = 'INSERT INTO courses_announce (course_id, created_by, type) VALUES (?, ?, ?)';
            parm = [courseId, id, 'announce'];
        } else if (!time && max_participants) {
            query = 'INSERT INTO courses_announce (course_id, created_by, type, max_participants) VALUES (?, ?, ?, ?)';
            parm = [courseId, id, 'announce', max_participants];
        } else if (time && !max_participants) {
            query = 'INSERT INTO courses_announce (course_id, time, created_by, type) VALUES (?, ?, ?, ?)';
            parm = [courseId, time, id, 'announce'];
        }


        const [course] = await db.query(
            query,
            parm
        );

        if (course.affectedRows === 0) {
            return res.status(500).send('Failed to announce course');

        }

        //make announcement
        await db.query(
            'INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)',
            [courseDetails[0].title, `Section ${courseDetails[0].title} ${!time ? '' : `on ${time}`} has been announced`, id]
        );



        res.status(200).send('Course announced successfully');
    } catch (err) {
        console.error('Error announcing course:', err);
        return res.status(500).send('Error announcing course: ' + err.message);
    }


});

app.post('/courses_announce/:id/enroll', async (req, res) => {
    const courseId = req.params.id;
    const {student_id} = req.body;

    try {
        const [check] = await db.query(
            'SELECT * FROM course_enrollments WHERE student_uid = ? AND course_id = ?',
            [student_id, courseId]
        );
        if (check.length > 0) {

            await db.query(
                'DELETE FROM course_enrollments WHERE student_uid = ? AND course_id = ?',
                [student_id, courseId]
            )
            await db.query(
                'UPDATE courses_announce SET participants = participants - 1 WHERE id = ?',
                [courseId]
            );
            //check  woulnt full
            const [course] = await db.query(
                'SELECT * FROM courses_announce WHERE id = ?',
                [courseId]
            );
            if (course[0].max_participants && course[0].participants < course[0].max_participants) {
                await db.query(
                    'UPDATE courses_announce SET status = "open" WHERE id = ?',
                    [courseId]
                );
            }


            return res.status(200).send('Unenrolled successfully');

        }
        //check if participants = max_participants
        const [course] = await db.query(
            'SELECT * FROM courses_announce WHERE id = ?',
            [courseId]
        );
        if (!course[0].max_participants) // no limit on participants
            ;

        else if (course[0].participants >= course[0].max_participants)
            return res.status(200).send('Course is full');


        await db.query(
            'INSERT INTO course_enrollments (student_uid, course_id) VALUES (?, ?)',
            [student_id, courseId]
        );

        await db.query(
            'UPDATE courses_announce SET participants = participants + 1 WHERE id = ?',
            [courseId]
        );

        const [checks] = await db.query(
            'SELECT * FROM courses_announce WHERE id = ?',
            [courseId]
        );
        if (checks[0].max_participants && checks[0].participants == checks[0].max_participants) {

            db.query(
                'UPDATE courses_announce SET status = "closed" WHERE id = ?',
                [courseId]
            )
        }


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
        if (check.length > 0) {

            //remove vote
            await db.query(
                'DELETE FROM course_votes WHERE student_id = ? AND course_id = ?',
                [student_id, courseId]
            );

            await db.query(
                'UPDATE courses_announce SET votes = votes - 1 WHERE id = ?',
                [courseId]
            );

            return res.status(200).send('Voted Removed');

        }
        //check if participants = max_participants
        const [course] = await db.query(
            'SELECT * FROM courses_announce WHERE id = ?',
            [courseId]
        );


        await db.query(
            'INSERT INTO course_votes (student_id, course_id) VALUES (?, ?)',
            [student_id, courseId]
        );

        await db.query(
            'UPDATE courses_announce SET votes = votes + 1 WHERE id = ?',
            [courseId]
        );

        res.send('Vote Recorded');
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
            'INSERT INTO feedback (student_id, message) VALUES (?, ?)',
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

    var p2 = to_id.trim(); // If to_id is not provided, set it to an empty string
    p2 = p2.trim();


    console.log(!!p2);
    var p = p2 ? ` = '${p2}' ` : 'is null'; // If to_id is not provided, set it to 'is null' for the query

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
            [request[0].partner_2, request[0].partner_2, request[0].subject]
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
                'DELETE FROM student_partners WHERE( partner_1 = ? or partner_1 = ?) AND subject = ? AND status = "pending"',
                [request[0].partner_2, request[0].partner_1, request[0].subject]
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

app.post('/supervisor/request', async (req, res) => {
    const {student_id, partnership_id, supervisor_id, subject, description} = req.body;

    // Validate required fields
    if (!student_id || !supervisor_id || !partnership_id || !subject) {
        return res.status(400).json({error: 'Missing required fields'});
    }

    try {

        // Check if the partnership have a confirmed status
        const [partnership] = await db.query(
            'SELECT * FROM supervisor_requests WHERE partnership_id = ?  AND status = "approved"',
            [partnership_id]
        );
        if (partnership.length > 0) {
            return res.status(400).json({error: 'Partnership already has a confirmed supervisor request'});
        }


        // Check if student already has a pending or approved request
        const [existingRequest] = await db.query(
            'SELECT * FROM supervisor_requests WHERE partnership_id = ? and supervisor_id = ? AND status IN ("pending", "approved")',
            [partnership_id, supervisor_id]
        );

        if (existingRequest.length > 0) {
            return res.status(400).json('You already have an active supervision request');
        }

        // Insert new supervision request
        const [result] = await db.query(
            'INSERT INTO supervisor_requests (partnership_id, supervisor_id, subject,description) VALUES (?, ?, ?,?)',
            [partnership_id, supervisor_id, subject, description]
        );

        res.status(200).json({
            message: 'Supervision request submitted successfully',
            request_id: result.insertId
        });
    } catch (err) {
        console.error('Error submitting supervision request:', err);
        res.status(500).json({error: 'Error submitting supervision request'});
    }
});

app.post('/supervisor/request/action', async (req, res) => {
    const {requestId, action} = req.body;
    //// const {status, project_description} = req.body;

    // Validate required fields
    if (!action || !requestId) {
        if (!action) {
            return res.status(400).json({error: `Missing action fields`});
        }
        if (!requestId) {
            return res.status(400).json({error: `Missing requestId fields`});
        }
    }

    let state = action === 'approve' ? 'approved' : 'rejected'; // Normalize status to 'approved' or 'rejected'

    try {
        // console.log('Request ID:', requestId);
        const [updatedRequest] = await db.query(
            'SELECT * FROM supervisor_requests  WHERE id = ?',
            [requestId]
        );
        if (updatedRequest.length === 0) {
            return res.status(404).json({error: 'Supervision request not found'});
        }

        if (action === 'remove') {
            // Delete the request if action is 'remove'
            await db.query(
                'DELETE FROM supervisor_requests WHERE id = ?',
                [requestId]
            );
            return res.status(200).json({message: 'Supervision request removed successfully'});


        }

        // Update the status of the supervision request

        await db.query(
            'UPDATE supervisor_requests SET status = ? WHERE id = ?',
            [state, requestId]
        );

        //check if there's updated


        //delete other pending requests for the same partnership if approved
        if (action === 'approve') {
            await db.query(
                'DELETE FROM supervisor_requests WHERE partnership_id = (SELECT partnership_id FROM supervisor_requests WHERE id = ?) AND status = "pending"',
                [requestId]
            );
        }

        if (action === 'reject') {

            // Optionally, delete the request if rejected
            await db.query(
                'DELETE FROM supervisor_requests WHERE id = ?',
                [requestId]
            );


        }


        res.status(200).json(`Supervision request ${state} successfully`);
    } catch (err) {
        console.error('Error updating supervision request:', err);
        res.status(500).json({error: 'Error updating supervision request'});
    }
});

app.post('/courses_announce/changeType', async (req, res) => {
    const {courseId, type} = req.body;

    if (!courseId || !type) {
        return res.status(400).json({error: 'Missing courseId or newType'});
    }

    try {
        //check if course exists
        const [course] = await db.query(
            'SELECT * FROM courses_announce WHERE id = ?',
            [courseId]
        );
        if (course.length === 0) {
            return res.status(404).json({error: 'Course not found'});
        }

        // Update the course type
        await db.query(
            'UPDATE courses_announce SET type = ? WHERE id = ?',
            [type, courseId]
        );

        res.status(200).json({message: 'Course type updated successfully'});
    } catch (err) {
        console.error('Error updating course type:', err);
        res.status(500).json({error: 'Error updating course type'});
    }
});


app.listen(port, () => {
    console.log(`Server  running on http://localhost:${port}`);
});


// module.exports = router;