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

  // Calculate the child's age and determine the category
  const age = calculateAge(newRegistration.age);
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
      // If parsing fails, re-initialize as an empty array
      registrations = [];
    }

    // Generate the registration ID
    const registrationID = generateRegistrationID(
      newRegistration.school,
      category,
      registrations
    );

    // Add the registration ID to the new registration object
    newRegistration.registrationID = registrationID;

    // Check for duplicate phone or email
    const duplicateEntry = registrations.find(
      (reg) =>
        reg.phoneNo === newRegistration.phoneNo ||
        reg.email === newRegistration.email
    );
    if (duplicateEntry) {
      return res.status(400).send("Mobile number already used to register.");
    }

    // Add the new registration to the existing registrations
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

// Function to generate a registration ID
function generateRegistrationID(school, category, registrations) {
  const schoolCodes = {
    "St Charles High School": "SCH",
    "St Nirmala's High School": "NHS",
    "St Paul's High School": "PHS",
    "Florence High School": "FHS",
    "St Francis High School": "SFX",
    "St Anthony's High School": "AHS",
    "St John's": "SJS",
    "St Alphonsus Academy": "SAA",
    "St Alyosis High School": "AHS",
    "St Germains High School": "GHC",
    "Clarence High School": "CHS",
    "Cluny Convent High School": "CCS",
    "BMS High School": "BMS",
    "St Josephs Indian High School": "SJI",
    "St Josephs European High School": "SJE",
    "Sophia High School": "SHS",
    "Norte Dame School": "NDS",
    "Balwins High School": "BHS",
    "Bishop Cottons Girls School": "BCG",
    "Bishop Cottons Boys School": "BGB",
    "Chitayana School Horumavu": "CSH",
    "Mount Carmels High School": "MCS",
  };

  const schoolCode = schoolCodes[school] || "XXX"; // Use "XXX" if school code is not found
  const categoryCount =
    registrations.filter(
      (reg) => reg.registrationID && reg.registrationID.includes(category)
    ).length + 1;
  const serialNumber = String(categoryCount).padStart(4, "0"); // e.g., 0001, 0002, etc.
  return `${schoolCode}${category}_${serialNumber}`;
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
