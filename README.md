# fmpg
FMPG is a platform designed to help users find paying guest (PG) accommodations and hostels near various locations. The project is built using Node.js, Express, MongoDB, and EJS templates. It includes features such as user management, property and room management, and a booking system, along with an admin panel and property owner-specific functionalities.

Table of Contents
    Technologies Used
    Project Structure
    Installation and Setup
    Features
    User Management
    Property Management
    Booking System
    Admin Panel
    Owner Dashboard
    Routes Overview
    Schemas
    Environment Variables
    Technologies Used
    Node.js
    Express.js
    MongoDB (Mongoose)
    EJS (Embedded JavaScript templating)
    Passport.js (User Authentication)
    Nodemailer (Email functionality)
    PDFKit (Invoice generation)

Project Structure
The project is structured into the following folders and files:
    .
    ├── routes
    │   ├── adminroutes.js
    │   ├── roomdb.js
    │   ├── propertyroutes.js
    │   ├── bookingroutes.js
    │   ├── contactroutes.js
    │   └── ownerroutes.js
    ├── models
    │   ├── Analysis.js
    │   ├── Booking.js
    │   ├── Contact.js
    │   ├── Property.js
    │   ├── Room.js
    │   └── User.js
    ├── views
    │   ├── index.ejs
    │   ├── addProperty.ejs
    │   ├── admin/
    │   └── ...
    ├── public
    │   ├── css/
    │   ├── img/
    │   └── js/
    ├── app.js
    ├── db.js
    └── ...

Installation and Setup:
1.Clone the repository:
git clone https://github.com/your-repo-url/fmpg.git
cd fmpg
2.Install dependencies:
npm install
3.Create a MongoDB database and update the db.js file with your database credentials.

4.Environment variables: Create a .env file to store your sensitive information such as database URIs, email credentials, etc.
PORT=3000
DB_URL=your_mongoDB_url
EMAIL_USER=your_email
EMAIL_PASS=your_email_app_password

5.Start the application:

6.Run the application:npm start

Access the application: Visit http://localhost:3000 in your browser.

.Features
User Management
Signup and login with email and mobile verification.
Users can reset their password using OTP sent to their email.
Admins can view, add, edit, and delete users.

.Property Management
Admins can add, edit, and delete properties.
Properties include details like name, location, type, images, amenities, and associated rooms.
Property owners can manage bookings for their own properties.

.Booking System
Users can book rooms for a specific property.
Admins can manage all bookings, including accepting and rejecting requests.
Owners can confirm or cancel bookings for their properties, and users receive email confirmations with PDF invoices.

.Admin Panel
Admins can manage users, properties, rooms, and bookings.
Analytics are available for total bookings, property occupancy rates, and booking status summaries.
.Owner Dashboard
Property owners can view and manage bookings for properties they own.
Owners can send invoices to users when confirming or canceling bookings.

.Routes Overview
User Routes (/users): Manage users.
Property Routes (/properties): Manage properties.
Room Routes (/rooms): Manage rooms associated with properties.
Booking Routes (/bookings): Handle bookings for properties and rooms.
Admin Routes (/admin): Admin functionalities for user, property, room, and booking management.
Owner Routes (/owner): Property owner-specific routes for managing bookings.

.Schemas
User: Stores user details such as username, email, mobile, password, and role (user, admin, superadmin, or owner).
Property: Stores property details including name, location, type, images, amenities, rooms, and owner.
Room: Stores room details including property reference, number, type, price, and availability.
Booking: Stores booking details like start and end dates, room type, special requests, and status (pending, confirmed, or canceled).
Contact: Stores messages sent via the contact form.

.Environment Variables
Ensure you have the following environment variables set up:

PORT: The port your server will run on.
DB_URL: MongoDB connection string.
EMAIL_USER: Your email address for sending notifications.
EMAIL_PASS: App password or email credentials for sending emails


1. Admin Routes (adminroutes.js)
GET /admin/users: View all users.
POST /admin/users/add: Add a new user.
POST /admin/users/edit/:id: Edit a user.
POST /admin/users/delete/:id: Delete a user.
GET /admin/properties: View all properties.
POST /admin/properties/add: Add a new property.
POST /admin/properties/edit/:id: Edit a property.
POST /admin/properties/delete/:id: Delete a property.
GET /admin/bookings: View all bookings.
POST /admin/bookings/add: Add a booking.
POST /admin/bookings/edit/:id: Edit a booking.
POST /admin/bookings/delete/:id: Delete a booking.

2. Property Routes (propertyroutes.js)
GET /properties: Fetch all properties.
GET /properties/:id: Fetch a specific property by ID.
POST /properties/add: Add a new property.
PUT /properties/edit/:id: Update property details.
DELETE /properties/delete/:id: Delete a property.

3. Room Routes (roomdb.js)
GET /rooms: Fetch all rooms.
GET /rooms/add: Display the form to add a room.
POST /rooms/add: Create a new room.
GET /rooms/edit/:id: Edit a specific room.
POST /rooms/edit/:id: Update room details.
DELETE /rooms/delete/:id: Delete a room.
Booking Routes (bookingroutes.js)
GET /bookings: Fetch all bookings.
POST /bookings/add: Add a new booking.
POST /bookings/edit/:id: Edit an existing booking.
POST /bookings/delete/:id: Delete a booking.
Owner Routes (ownerroutes.js)
GET /owner: View bookings for properties owned by the logged-in owner.
POST /bookings/:id/accept: Confirm a booking and send an invoice.
POST /bookings/:id/decline: Decline a booking and send a cancellation notice.
Contact Routes (contactroutes.js)
POST /contact: Handle contact form submissions.
GET /admin/messages: View all messages.

4. Schema Explanation
User Schema (User.js): Manages user roles (user, admin, superadmin, owner), email, mobile, and password. Integrates OTP for password recovery.
Property Schema (Property.js): Stores property details like name, location, images, amenities, and rooms.
Room Schema (Room.js): Associates with a property and includes details such as room number, type, price, and availability.
Booking Schema (Booking.js): Links users, rooms, and properties. Tracks booking status (pending, confirmed, canceled).
Contact Schema (Contact.js): Stores messages sent through the contact form.

5. Middleware Functions
isAuthenticated: Ensures that only authenticated users can access specific routes.
ensureOwner: Ensures that only users with the "owner" role can access certain routes.

6. Email and OTP Functionality
Nodemailer is used to send OTPs for password recovery and booking confirmations/cancellations.
Password recovery: Users can request an OTP, which is emailed to them, allowing them to reset their password.

7. Deployment Guide
Hosting: Use platforms like Heroku, AWS, or DigitalOcean to host the Node.js application.
MongoDB: Use MongoDB Atlas for database hosting.
Environment Variables: Ensure all environment variables are properly set in your hosting platform.

8. Extending the Application
To extend the FMPG platform:

Add more user roles: Modify the User schema and adjust routes for new roles.
Introduce new property features: Add more fields to the Property schema and corresponding views.
Integrate payment gateways: Add a service like Stripe or PayPal to handle payments directly on the platform.