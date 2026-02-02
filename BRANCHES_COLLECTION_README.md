# Firebase Branches Collection Documentation

## Overview
The `branches` collection in Firebase Firestore stores all branch information including GPS coordinates and attendance settings. This collection is used to validate staff locations during clock-in/out operations.

## Collection Structure

### Collection Name: `branches`

### Document Fields:
```json
{
  "name": "Head Office",
  "address": "123 Business District, Lagos",
  "location": {
    "lat": 6.524379,
    "lng": 3.379206
  },
  "companyId": "company-uuid-here",
  "attendanceSettings": {
    "startTime": "09:00",
    "requireLocation": true,
    "locationRadius": 100,
    "isActive": true
  },
  "createdAt": "2025-01-01T09:00:00.000Z",
  "createdBy": "user-uid-here"
}
```

## Field Descriptions

### Required Fields
- **`name`** (string): Branch name (e.g., "Head Office", "Downtown Branch")
- **`location`** (object): GPS coordinates
  - `lat` (number): Latitude in decimal degrees
  - `lng` (number): Longitude in decimal degrees
- **`companyId`** (string): Reference to the company this branch belongs to

### Optional Fields
- **`address`** (string): Physical address of the branch
- **`attendanceSettings`** (object): Branch-specific attendance policies
  - `startTime` (string): Work start time in "HH:MM" format (default: "09:00")
  - `requireLocation` (boolean): Whether GPS validation is required (default: true)
  - `locationRadius` (number): Allowed distance from branch in meters (default: 100)
  - `isActive` (boolean): Whether this branch is active (default: true)
- **`createdAt`** (timestamp): When the branch was created
- **`createdBy`** (string): UID of the user who created the branch

## Usage in Attendance System

### 1. Staff Assignment
When creating a staff account, administrators assign a `branchId` to the user document:
```json
{
  "users": {
    "user-uid": {
      "name": "John Doe",
      "email": "john@company.com",
      "role": "staff",
      "companyId": "company-uuid",
      "branchId": "branch-document-id",
      // ... other fields
    }
  }
}
```

### 2. Clock-In Validation Process
When a staff member clocks in:

1. **Get User Branch**: System fetches `branchId` from user document
2. **Fetch Branch Data**: Query `branches` collection for branch document
3. **Extract Location**: Get GPS coordinates from branch `location` field
4. **Calculate Distance**: Use Haversine formula to calculate distance from user's current GPS
5. **Validate Radius**: Check if distance ≤ `locationRadius`
6. **Record Attendance**: Store attendance record if validation passes

### 3. Distance Calculation (Haversine Formula)
```javascript
const R = 6371e3; // Earth's radius in meters
const φ1 = branchLat * Math.PI/180;
const φ2 = userLat * Math.PI/180;
const Δφ = (userLat - branchLat) * Math.PI/180;
const Δλ = (userLng - branchLng) * Math.PI/180;

const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

const distance = R * c; // Distance in meters
```

## API Endpoints

### Branches Management
- `GET /api/branches` - Get all branches for company
- `POST /api/branches` - Create new branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Delete branch
- `POST /api/branches/:id/assign-user` - Assign user to branch

### Attendance Validation
- `POST /api/attendance/clock-in` - Clock in with GPS validation
- `POST /api/attendance/clock-out` - Clock out

## Example Usage

### Creating a Branch
```javascript
const branchData = {
  name: "Downtown Office",
  address: "456 Main Street, City Center",
  location: { lat: 40.7128, lng: -74.0060 },
  companyId: "company-123",
  attendanceSettings: {
    startTime: "08:30",
    requireLocation: true,
    locationRadius: 150,
    isActive: true
  }
};

// This creates a document in the 'branches' collection
await db.collection('branches').add(branchData);
```

### Staff Clock-In Validation
```javascript
// When staff clocks in:
const userLocation = { lat: 40.7129, lng: -74.0061 }; // Staff's current GPS
const branchDoc = await db.collection('branches').doc(user.branchId).get();
const branchLocation = branchDoc.data().location;
const radius = branchDoc.data().attendanceSettings.locationRadius;

// Calculate distance and validate
const distance = calculateDistance(
  branchLocation.lat, branchLocation.lng,
  userLocation.lat, userLocation.lng
);

if (distance <= radius) {
  // Allow clock-in
  await recordAttendance(user, userLocation);
} else {
  // Deny clock-in - too far from office
  throw new Error(`Must be within ${radius}m of office location`);
}
```

## Security & Permissions

### Access Control
- **Company Admins**: Can manage branches within their company
- **Super Admins**: Can manage branches across all companies
- **Staff**: Cannot modify branch data, only use location validation

### Data Validation
- GPS coordinates must be valid decimal degrees
- Company ownership is enforced
- Location radius has reasonable limits (10-1000 meters)

## Migration & Setup

Run the migration script to initialize the collection structure:
```bash
node backend/migrateBranches.js
```

This will show the expected Firestore collection structure and validation logic.

## Monitoring & Analytics

The branches collection enables:
- **Location-based attendance tracking**
- **Geofencing compliance monitoring**
- **Multi-branch attendance analytics**
- **Remote work policy enforcement**

## Future Enhancements

Potential additions:
- **Branch-specific working hours**
- **Geofence alerts for late arrivals**
- **Location history tracking**
- **Integration with Google Maps APIs**
- **Branch capacity management**
