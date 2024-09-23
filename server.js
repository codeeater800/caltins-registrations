const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;
const jsonFilePath = path.join(__dirname, "event-registrations.json");

// Middleware to serve static files (HTML, CSS, etc.)
app.use(express.static("public"));

// Middleware to parse JSON form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure the JSON file exists, if not, create an empty array
if (!fs.existsSync(jsonFilePath)) {
  fs.writeFileSync(jsonFilePath, "[]", "utf-8");
}

// Endpoint to serve event-registrations.json
app.get("/event-registrations.json", (req, res) => {
  fs.readFile(jsonFilePath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading the registration data.");
    }
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  });
});

// Route to view the registration data in the browser
app.get("/admin/registrations", (req, res) => {
  fs.readFile(jsonFilePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading registrations.");
    }
    res.send(`
      <html>
      <head><title>Registrations</title></head>
      <body>
      <h1>Event Registrations</h1>
      <pre>${data}</pre>
      </body>
      </html>
    `);
  });
});

// Route to download the JSON file
app.get("/admin/download-registrations", (req, res) => {
  res.download(jsonFilePath, "event-registrations.json", (err) => {
    if (err) {
      res.status(500).send("Error downloading file.");
    }
  });
});

// Endpoint to handle form submission and save data to the JSON file
app.post("/register", (req, res) => {
  const newRegistration = req.body;

  // Calculate the child's age and determine the category (CAT)
  const age = calculateAge(newRegistration.dateOfBirth);
  const category = getCategoryByAge(age);

  if (!category) {
    return res.status(400).send("Age does not fall within the valid range.");
  }

  // Read the existing JSON file
  fs.readFile(jsonFilePath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).send("Error reading data.");
    }

    let registrations = [];

    try {
      registrations = JSON.parse(data); // Try parsing the file's contents
    } catch (parseError) {
      registrations = [];
    }

    // Check how many times the phone number has been used
    const phoneRegistrations = registrations.filter(
      (reg) => reg.phoneNo === newRegistration.phoneNo
    );

    // Maximum registrations exceeded case
    if (phoneRegistrations.length >= 3) {
      return res
        .status(400)
        .send("Maximum registrations exceeded for this number.");
    }

    // If phone has been used less than 3 times, show the message but still accept the entry
    if (phoneRegistrations.length > 0 && phoneRegistrations.length < 3) {
      const registrationID = generateRegistrationID(
        newRegistration.educationBoard,
        category,
        registrations
      );

      newRegistration.registrationID = registrationID;
      registrations.push(newRegistration);

      fs.writeFile(
        jsonFilePath,
        JSON.stringify(registrations, null, 2),
        (err) => {
          if (err) {
            return res.status(500).send("Error writing data.");
          }
          res
            .status(200)
            .send(
              "Mobile number was previously used to register. If you wish to register for another child with the same number, please proceed."
            );
        }
      );
      return; // Return after saving entry
    }

    // Normal case: New registration
    const registrationID = generateRegistrationID(
      newRegistration.educationBoard,
      category,
      registrations
    );

    newRegistration.registrationID = registrationID;

    registrations.push(newRegistration);

    // Write the updated data back to the file
    fs.writeFile(
      jsonFilePath,
      JSON.stringify(registrations, null, 2),
      (err) => {
        if (err) {
          return res.status(500).send("Error writing data.");
        }
        res
          .status(200)
          .send(
            `Registration successful! Your Registration ID is: ${registrationID}`
          );
      }
    );
  });
});

// Function to calculate the child's age
function calculateAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

// Function to determine the category based on age
function getCategoryByAge(age) {
  if (age >= 5 && age <= 8) return "CAT1";
  if (age >= 9 && age <= 12) return "CAT2";
  if (age >= 13 && age <= 16) return "CAT3";
  return null;
}

// Function to generate a registration ID based on category and education board
function generateRegistrationID(educationBoard, category, registrations) {
  // Filter the registrations by the category to calculate the serial number
  const categoryCount =
    registrations.filter((reg) => reg.registrationID.includes(category))
      .length + 1;
  const serialNumber = String(categoryCount).padStart(3, "0"); // e.g., 001, 002, etc.
  return `${educationBoard}_${category}_${serialNumber}`;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
