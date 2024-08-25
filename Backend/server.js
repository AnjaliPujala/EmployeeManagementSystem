const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  return res.json("From backend side");
});

app.listen(8081, () => {
  console.log("Listening on port 8081");
});

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "@N101l09123",
  database: "myconn"
});

app.get('/employees', (req, res) => {
  const sql = "SELECT * from employees";
  conn.query(sql, (err, data) => {
    if (err) return res.json(err);
    res.json(data);
  });
});


  
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/assignments/:id/document', (req, res) => {
    const assignmentId = req.params.id;
    console.log(assignmentId)
    const sql = "SELECT document_path FROM assignments WHERE assignment_id = ?";
  
    conn.query(sql, [assignmentId], (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0) return res.status(404).json({ message: "Document not found" });
  
      const documentPath = results[0].document_path;
      res.sendFile(path.resolve(documentPath), (err) => {
        if (err) {
          res.status(500).send('Error retrieving document');
        }
      });
    });
  });

/////////////////////////////////////////////////////////////
const multer  = require('multer')


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() ;
      cb(null, file.originalname);
    }
  })
  
  const upload = multer({ storage: storage })

  app.post('/upload-file', upload.single('file'), (req, res) => {
    const fileName = req.file.filename;
    const id = req.body.ID;
    const filePath = `/uploads/${fileName}`;
  
    try {
      const sql = 'UPDATE assignments SET submitted_document_path = ?, is_submitted = 1 WHERE assignment_id = ?';
      conn.query(sql, [filePath, id], (err, results) => {
        if (err) return console.error(err);
        res.json({ message: 'File uploaded successfully', filePath });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

////////////////////////////////////////////


const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/assign-task', upload.single('file'), (req, res) => {
  const {assigned_by, assigned_to, due_date } = req.body;
  console.log("Assigned by :",assigned_by);
  const document_path = req.file.path; 

  try {
    const sql = 'INSERT INTO assignments (assigned_by,assigned_to, due_date, document_path, assigned_date) VALUES (?,?, ?, ?, NOW())';
    conn.query(sql, [assigned_by,assigned_to, due_date, document_path], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to assign task' });
      }
      res.json({ message: 'Task assigned successfully', filePath: document_path });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to assign task', error: err.message });
  }
});


app.use('/documents', express.static(path.join(__dirname, 'public/documents')));


app.get('/tasks-assigned-by/:teacherId', (req, res) => {
  const teacherId = req.params.teacherId;
  const sql = `
    SELECT a.assignment_id, a.assigned_to, e.Name AS assigned_to_name, a.document_path, a.assigned_date, a.due_date, a.is_submitted
    FROM assignments a
    JOIN employees e ON a.assigned_to = e.Employee_id
    WHERE a.assigned_by = ?
  `;

  conn.query(sql, [teacherId], (err, results) => {
    if (err) {
      console.error("SQL error:", err);
      return res.status(500).json({ message: "Failed to retrieve tasks", error: err.message });
    }
    res.json(results);
  });
});


app.get('/assignments/:assignmentId/submitted-document', (req, res) => {
  const assignmentId = req.params.assignmentId;
  const sql = 'SELECT submitted_document_path FROM assignments WHERE assignment_id = ?';
  conn.query(sql, [assignmentId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to retrieve submitted document' });
    if (results.length === 0) return res.status(404).json({ message: 'Submitted document not found' });

    const submittedDocumentPath = results[0].submitted_document_path;
    res.sendFile(path.join(__dirname, submittedDocumentPath));
  });
});


//////////////////////////////////////////////////// login signup page
app.post('/LoginSignup', (req, res) => {
  const { name, email, password,confirm_password, empid, qualification, department, role, phone } = req.body;
  const sql = "INSERT INTO employees (Name, Email, Password, Employee_id,  Qualification, Role, Phone_num,ConfirmPassword, Department) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

  console.log('Received data:', req.body);

  if (!name || !email || !password || !empid || !confirm_password || !qualification || !department || !role || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
  }

  conn.query(sql, [name, email, password, empid, qualification, role, phone, confirm_password, department], (err, result) => {
      if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ error: 'Database query error', details: err.message });
      }
      res.status(200).json({ message: 'Data saved successfully', result });
  });
});

app.post('/Login', (req, res) => {
  const { empid, password } = req.body;
  const sql = "SELECT * FROM employees WHERE Employee_id = ? AND Password = ?";

  console.log('Login attempt:', req.body);

  if (!empid || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required' });
  }

  conn.query(sql, [empid, password], (err, results) => {
      if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ error: 'Database query error', details: err.message });
      }

      if (results.length > 0) {
          res.status(200).json({ message: 'Login successful', user: results[0] });
      } else {
          res.status(401).json({ error: 'Invalid employee ID or password' });
      }
  });
});

/////////////////after logged in


app.post('/Employee-Details', (req, res) => {
  const { empId } = req.body;
  const sql = "SELECT * FROM employees WHERE Employee_id = ?";
  console.log(sql);
  console.log(empId)
  conn.query(sql, [empId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      console.log(result);
      res.json(result);
    }
  });
});


//////////Edit.js

app.post('/update-employee', (req, res) => {
  const { Employee_id, Name, Email, Department, Role, Phone_num } = req.body;
  const sql = `
    UPDATE employees 
    SET Name = ?, Email = ?, Department = ?, Role = ?, Phone_num = ? 
    WHERE Employee_id = ?
  `;

  conn.query(sql, [Name, Email, Department, Role, Phone_num, Employee_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to update employee details" });
    }
    console.log(`Employee with ID ${Employee_id} updated successfully`);
    res.json({ message: "Employee details updated successfully" });
  });
});


////////////////////////////////////////to retrieve the assignments of the user
app.post('/get-assignments', (req, res) => {
  const userId = req.body.userId;
  console.log("Backend : ", userId);
  const sql = `
    SELECT a.assignment_id, a.assigned_by, e.Name AS assigned_by_name, a.assigned_date, a.due_date, a.document_path, a.is_submitted, a.submitted_document_path
    FROM assignments a
    JOIN employees e ON a.assigned_by = e.Employee_id
    WHERE a.assigned_to = ?
  `;
  conn.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Failed to retrieve assignments:", err);
      return res.status(500).json({ message: 'Failed to retrieve assignments', error: err });
    }
    console.log("Assignments fetched for user:", userId, results);
    res.json(results);
  });
});



////////////////////////////to select employees

app.get('/employees-to-select/:Id', (req, res) => {
  const Id=req.params.Id;
  const sql=`select * from employees where Employee_id != ?`;
  conn.query(sql, [Id], (err, results) =>{
    if(err){
      return console.log(err)
    }
    console.log(results);
    res.json(results);
  })
})


////////////////////////////////////////ask leave
app.post('/allDetails/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT eld.id, eld.emp_id, eld.leaveFrom, eld.leaveTo,eld.accepted, eld.reason, ed.Name, ed.Phone_num, ed.Role
    FROM employeeleavedetails eld
    INNER JOIN employees ed ON eld.emp_id = ed.Employee_id
    WHERE eld.emp_id = ?
  `;
  
  conn.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});



// Add a new leave
app.post('/employeeleavedetails', async (req, res) => {
  const { emp_id, leaveFrom, leaveTo, reason } = req.body;
  console.log(emp_id);
  try {
    // Fetch employee details
    const employeeResult = await new Promise((resolve, reject) => {
      conn.query('SELECT Name, Phone_num FROM employees WHERE Employee_id = ?', [emp_id], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });

    if (!employeeResult) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Insert leave details
    const leaveInsertResult = await new Promise((resolve, reject) => {
      conn.query('INSERT INTO employeeleavedetails (emp_id, leaveFrom, leaveTo, reason) VALUES (?, ?, ?, ?)', 
        [emp_id, leaveFrom, leaveTo, reason], (err, result) => {
          if (err) reject(err);
          else resolve(result.insertId);
        });
    });

    // Send success response
    res.status(201).json({ message: 'Leave details added successfully', leaveId: leaveInsertResult });
  } catch (err) {
    console.error("Error adding leave details:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// Delete leave details
app.delete('/employeeleavedetails/:id', (req, res) => {
  const { id } = req.params;  // Correctly get the id from request params


  conn.query('DELETE FROM employeeleavedetails WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error executing DELETE query:', err.message); // Debug log
      res.status(500).json({ error: err.message });
      return;
    }

    if (result.affectedRows === 0) {
  
      res.status(404).json({ error: 'Leave not found' });
      return;
    }

    res.json({ message: 'Leave deleted successfully' });
  });
});

//Edit
app.put('/employeeleavedetails/:Id', (req, res) => {
  const { Id } = req.params;  // Correctly get the id from request params
  const { leaveFrom, leaveTo, reason } = req.body;

 console.log(Id);

  const query = `UPDATE employeeleavedetails
                 SET leaveFrom = ?, leaveTo = ?, reason = ?
                 WHERE id = ?`;

  conn.query(query, [leaveFrom, leaveTo, reason, Id], (err, result) => {
    if (err) {
      console.error("Error executing query:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }

    if (result.affectedRows === 0) {
    
      res.status(404).json({ error: 'Leave not found' });
      return;
    }

    
    res.json({ Id, leaveFrom, leaveTo, reason });
  });
});





// Get leave details by ID
app.get('/view-details/:Id', (req, res) => {
  const { Id } = req.params;  
  console.log(Id);

  const query = `SELECT eld.id, eld.emp_id, eld.leaveFrom, eld.leaveTo, eld.reason, ed.Name, ed.Phone_num 
                 FROM employeeleavedetails eld
                 JOIN employees ed ON eld.emp_id = ed.Employee_id 
                 WHERE eld.id = ?`;

  conn.query(query, [Id], (err, result) => {
    if (err) {
      console.error("Error executing query:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.length === 0) {
     
      res.status(404).json({ error: 'Leave not found' });
      return;
    }
   
    res.json(result[0]);
  });
});



//////////////////////////////to get employee leaves
app.get('/leave-details', (req, res) => {
  const sql = `
    SELECT eld.id, eld.emp_id, eld.leaveFrom, eld.leaveTo, eld.reason, ed.Name, ed.Phone_num, ed.Role
    FROM employeeleavedetails eld
    JOIN employees ed ON eld.emp_id = ed.Employee_id
  `;
  
  conn.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      console.log(results);
      res.json(results);
    }
  });
});
// Endpoint to accept leave request
app.post('/accept-leave', (req, res) => {
  const { id } = req.body;
  const sql = "UPDATE employeeleavedetails SET accepted = 1 WHERE id = ?";
  conn.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      res.json({ message: 'Leave request accepted' });
    }
  });
});


// Endpoint to reject leave request with reason
app.post('/reject-leave', (req, res) => {
  const { id, rejectReason } = req.body;
  console.log('Reject request received:', { id, rejectReason });

  const sql = "UPDATE employeeleavedetails SET accepted = 0, rejectReason = ? WHERE id = ?";
  conn.query(sql, [rejectReason, id], (err, result) => {
    if (err) {
      console.error('Error executing query:', err.message);
      res.status(500).send(err);
    } else {
      console.log(`Leave request for ID ${id} rejected successfully.`);
      res.json({ message: 'Leave request rejected' });
    }
  });
});


//////////////////////////////////////Ratings

app.get('/employees/:Id', (req, res) => {
  const Id = req.params.Id;
  const sql = "SELECT * FROM employees WHERE Employee_id != ?";
  conn.query(sql, [Id], (err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
});

app.get('/api/userRole/:empId', (req, res) => {
  const empId = req.params.empId;
  const sql = "SELECT Role FROM employees WHERE Employee_id = ?";

  conn.query(sql, [empId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'Employee not found' });

    res.json({ role: result[0].Role });
  });
});
app.post('/api/ratings', (req, res) => {
  const { employee_id, rating, submitted_by } = req.body;

  // Verify if the submitted_by user is an HOD
  const verifyHODSql = "SELECT Role FROM employees WHERE Employee_id = ?";
  conn.query(verifyHODSql, [submitted_by], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0 || result[0].Role !== 'HOD') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // If HOD, proceed to insert rating
    const sql = "INSERT INTO ratings (employee_id, rating) VALUES (?, ?)";
    conn.query(sql, [employee_id, rating], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Rating submitted successfully' });
    });
  });
});

app.get('/api/ratings/:Id', (req, res) => {
  const { Id } = req.params;
  const sql="SELECT rating from ratings where employee_id = ?"
  conn.query(sql,[Id],(err,result) => {
    if(err) return console.log(err);
    res.json(result);
  })
  
});



