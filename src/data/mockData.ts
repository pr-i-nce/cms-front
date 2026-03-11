export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  department: string;
  role: string;
  status: "Active" | "Inactive";
  dateJoined: string;
  audit: AuditFields;
}

export interface Department {
  id: string;
  name: string;
  leader: string;
  membersCount: number;
  status: "Active" | "Inactive";
  audit: AuditFields;
}

export interface Committee {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  audit: AuditFields;
}

export interface SMSRecord {
  id: string;
  message: string;
  recipients: string;
  recipientCount: number;
  date: string;
  status: "Delivered" | "Pending" | "Failed";
  recipientType: string;
  audit: AuditFields;
}

export interface SystemUser {
  id: string;
  name: string;
  role: string;
  email: string;
  status: "Active" | "Inactive";
  audit: AuditFields;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  audit: AuditFields;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  audit: AuditFields;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  audit: AuditFields;
}

export interface GroupRole {
  groupId: string;
  roleId: string;
}

export interface UserGroup {
  userId: string;
  groupId: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface DepartmentMember {
  departmentId: string;
  memberId: string;
  role: string;
}

export interface CommitteeMember {
  committeeId: string;
  memberId: string;
  role: string;
}

export interface AuditFields {
  createdBy: string;
  createdAt: string;
  lastEditedBy: string;
  lastEditedAt: string;
  sentBy?: string;
}

export interface Activity {
  id: string;
  action: string;
  details: string;
  time: string;
  type: "member" | "sms" | "department";
}

const deptNames = [
  "Youth Ministry", "Choir", "Ushering", "Media Team",
  "Sunday School", "Prayer Team", "Women Ministry", "Men Fellowship",
];
const roles = ["Leader", "Assistant Leader", "Member", "Coordinator", "Secretary"];
const firstNames = ["John", "Jane", "Peter", "Mary", "David", "Sarah", "James", "Grace", "Paul", "Ruth", "Daniel", "Esther", "Samuel", "Rebecca", "Andrew", "Martha", "Philip", "Naomi", "Timothy", "Priscilla"];
const lastNames = ["Smith", "Doe", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez"];

export const mockMembers: Member[] = Array.from({ length: 150 }, (_, i) => ({
  id: `m${i + 1}`,
  name: `${firstNames[i % 20]} ${lastNames[(i + 3) % 20]}`,
  phone: `+256${String(700000000 + i * 7)}`,
  email: `${firstNames[i % 20].toLowerCase()}.${lastNames[(i + 3) % 20].toLowerCase()}@email.com`,
  gender: i % 3 === 0 ? "Male" : "Female",
  department: deptNames[i % 8],
  role: roles[i % 5],
  status: i % 7 === 0 ? "Inactive" : "Active",
  dateJoined: `2024-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  audit: {
    createdBy: `${firstNames[(i + 2) % 20]} ${lastNames[(i + 6) % 20]}`,
    createdAt: `2024-${String(((i + 2) % 12) + 1).padStart(2, "0")}-${String(((i + 6) % 28) + 1).padStart(2, "0")} 09:12`,
    lastEditedBy: `${firstNames[(i + 5) % 20]} ${lastNames[(i + 9) % 20]}`,
    lastEditedAt: `2024-${String(((i + 4) % 12) + 1).padStart(2, "0")}-${String(((i + 10) % 28) + 1).padStart(2, "0")} 15:40`,
  },
}));

export const mockDepartments: Department[] = deptNames.map((name, i) => ({
  id: `d${i + 1}`,
  name,
  leader: `${firstNames[i * 2]} ${lastNames[i * 2]}`,
  membersCount: [42, 38, 25, 18, 30, 28, 35, 22][i],
  status: "Active",
  audit: {
    createdBy: `${firstNames[(i + 1) % 20]} ${lastNames[(i + 4) % 20]}`,
    createdAt: `2024-${String(((i + 3) % 12) + 1).padStart(2, "0")}-${String(((i + 7) % 28) + 1).padStart(2, "0")} 10:05`,
    lastEditedBy: `${firstNames[(i + 6) % 20]} ${lastNames[(i + 8) % 20]}`,
    lastEditedAt: `2024-${String(((i + 5) % 12) + 1).padStart(2, "0")}-${String(((i + 11) % 28) + 1).padStart(2, "0")} 16:20`,
  },
}));

export const mockSMS: SMSRecord[] = Array.from({ length: 100 }, (_, i) => ({
  id: `s${i + 1}`,
  message: [
    "Sunday service at 9am. All are welcome!",
    "Prayer meeting tonight at 7pm",
    "Youth camp registration is now open",
    "Choir practice this Saturday at 3pm",
    "Church cleanup day - volunteers needed",
  ][i % 5],
  recipients: i % 3 === 0 ? deptNames[i % 8] : `${firstNames[i % 20]} ${lastNames[(i + 3) % 20]}`,
  recipientCount: i % 3 === 0 ? 20 + (i % 30) : 1,
  date: `2024-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  status: i % 8 === 0 ? "Failed" : i % 5 === 0 ? "Pending" : "Delivered",
  recipientType: i % 3 === 0 ? "Department" : i % 4 === 0 ? "Category" : "Individual",
  audit: {
    createdBy: `${firstNames[(i + 2) % 20]} ${lastNames[(i + 1) % 20]}`,
    createdAt: `2024-${String(((i + 1) % 12) + 1).padStart(2, "0")}-${String(((i + 3) % 28) + 1).padStart(2, "0")} 08:30`,
    lastEditedBy: `${firstNames[(i + 4) % 20]} ${lastNames[(i + 5) % 20]}`,
    lastEditedAt: `2024-${String(((i + 2) % 12) + 1).padStart(2, "0")}-${String(((i + 6) % 28) + 1).padStart(2, "0")} 12:15`,
    sentBy: `${firstNames[(i + 6) % 20]} ${lastNames[(i + 7) % 20]}`,
  },
}));

export const mockUsers: SystemUser[] = [
  {
    id: "u1",
    name: "Admin User",
    role: "Super Admin",
    email: "admin@church.com",
    status: "Active",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-10 08:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-03-01 12:40",
    },
  },
  {
    id: "u2",
    name: "John Manager",
    role: "Admin",
    email: "john@church.com",
    status: "Active",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-15 10:12",
      lastEditedBy: "Grace Admin",
      lastEditedAt: "2024-02-21 09:10",
    },
  },
  {
    id: "u3",
    name: "Sarah Comms",
    role: "Communication Officer",
    email: "sarah@church.com",
    status: "Active",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-18 14:20",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-10 16:05",
    },
  },
  {
    id: "u4",
    name: "Peter Member",
    role: "Membership Manager",
    email: "peter@church.com",
    status: "Inactive",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-20 09:45",
      lastEditedBy: "John Manager",
      lastEditedAt: "2024-03-04 08:30",
    },
  },
  {
    id: "u5",
    name: "Grace Admin",
    role: "Admin",
    email: "grace@church.com",
    status: "Active",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-25 11:35",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-14 13:20",
    },
  },
  {
    id: "u6",
    name: "David Clerk",
    role: "Admin",
    email: "david@church.com",
    status: "Active",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-02-05 08:50",
      lastEditedBy: "Grace Admin",
      lastEditedAt: "2024-02-22 11:15",
    },
  },
];

export const mockGroups: Group[] = [
  {
    id: "g1",
    name: "Member",
    description: "Regular members with no assigned permissions.",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-12 08:30",
      lastEditedBy: "Grace Admin",
      lastEditedAt: "2024-02-02 09:10",
    },
  },
  {
    id: "g2",
    name: "Department Head",
    description: "Leads a department and oversees activity.",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-14 10:05",
      lastEditedBy: "John Manager",
      lastEditedAt: "2024-02-12 12:40",
    },
  },
  {
    id: "g3",
    name: "Department Secretary",
    description: "Supports department administration and reporting.",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-16 11:20",
      lastEditedBy: "Grace Admin",
      lastEditedAt: "2024-02-15 15:15",
    },
  },
  {
    id: "g4",
    name: "Department Treasurer",
    description: "Manages departmental finances.",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-18 09:50",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-20 10:25",
    },
  },
  {
    id: "g5",
    name: "Admin",
    description: "Administrative staff with elevated access.",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-20 08:15",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-26 14:05",
    },
  },
  {
    id: "g6",
    name: "Super Admin",
    description: "Full system access and oversight.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-03-01 09:00",
    },
  },
  {
    id: "g7",
    name: "Readonly",
    description: "View-only access for auditors and observers.",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-01-22 13:40",
      lastEditedBy: "Grace Admin",
      lastEditedAt: "2024-02-18 16:30",
    },
  },
];

export const mockRoles: Role[] = [
  {
    id: "r1",
    name: "Leader",
    description: "Lead teams and manage members.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "r2",
    name: "Member",
    description: "Standard membership access.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "r3",
    name: "SMS Officer",
    description: "Send SMS and manage outreach.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "r4",
    name: "Coordinator",
    description: "Coordinate departmental members.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "r5",
    name: "Admin",
    description: "Manage users and system settings.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "r6",
    name: "Super Admin",
    description: "Full platform control.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "r7",
    name: "Readonly",
    description: "Read-only visibility.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
];

export const mockPermissions: Permission[] = [
  {
    id: "p1",
    name: "VIEW_MEMBERS",
    description: "View member records.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "p2",
    name: "EDIT_MEMBERS",
    description: "Edit member information.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "p3",
    name: "SEND_SMS",
    description: "Send SMS campaigns.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "p4",
    name: "VIEW_DEPARTMENT_MEMBERS",
    description: "View department members.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "p5",
    name: "MANAGE_USERS",
    description: "Create and manage users.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "p6",
    name: "MANAGE_ROLES",
    description: "Manage roles and permissions.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
  {
    id: "p7",
    name: "VIEW_REPORTS",
    description: "Access reports and analytics.",
    audit: {
      createdBy: "System",
      createdAt: "2024-01-05 07:00",
      lastEditedBy: "Admin User",
      lastEditedAt: "2024-02-05 12:00",
    },
  },
];

export const mockGroupRoles: GroupRole[] = [
  { groupId: "g2", roleId: "r1" },
  { groupId: "g2", roleId: "r4" },
  { groupId: "g3", roleId: "r2" },
  { groupId: "g3", roleId: "r4" },
  { groupId: "g4", roleId: "r2" },
  { groupId: "g5", roleId: "r5" },
  { groupId: "g5", roleId: "r3" },
  { groupId: "g6", roleId: "r6" },
  { groupId: "g7", roleId: "r7" },
];

export const mockCommittees: Committee[] = [
  {
    id: "c1",
    name: "Finance Committee",
    description: "Budgeting and financial oversight.",
    status: "Active",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-02-01 09:00",
      lastEditedBy: "Grace Admin",
      lastEditedAt: "2024-02-20 10:30",
    },
  },
  {
    id: "c2",
    name: "Welfare Committee",
    description: "Member care and welfare support.",
    status: "Active",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-02-05 11:10",
      lastEditedBy: "John Manager",
      lastEditedAt: "2024-02-22 14:15",
    },
  },
  {
    id: "c3",
    name: "Events Committee",
    description: "Planning and events coordination.",
    status: "Active",
    audit: {
      createdBy: "Admin User",
      createdAt: "2024-02-08 08:45",
      lastEditedBy: "Grace Admin",
      lastEditedAt: "2024-02-26 16:40",
    },
  },
];

export const mockUserGroups: UserGroup[] = [
  { userId: "u1", groupId: "g6" },
  { userId: "u2", groupId: "g5" },
  { userId: "u2", groupId: "g2" },
  { userId: "u3", groupId: "g5" },
  { userId: "u4", groupId: "g1" },
  { userId: "u5", groupId: "g5" },
  { userId: "u6", groupId: "g3" },
];

export const mockDepartmentMembers: DepartmentMember[] = [
  { departmentId: "d1", memberId: "m1", role: "Leader" },
  { departmentId: "d1", memberId: "m2", role: "Member" },
  { departmentId: "d2", memberId: "m3", role: "Leader" },
  { departmentId: "d2", memberId: "m4", role: "Coordinator" },
  { departmentId: "d3", memberId: "m5", role: "Member" },
  { departmentId: "d3", memberId: "m6", role: "Secretary" },
  { departmentId: "d4", memberId: "m7", role: "Member" },
  { departmentId: "d5", memberId: "m8", role: "Leader" },
  { departmentId: "d6", memberId: "m9", role: "Member" },
  { departmentId: "d7", memberId: "m10", role: "Leader" },
  { departmentId: "d8", memberId: "m11", role: "Member" },
  { departmentId: "d2", memberId: "m1", role: "Member" },
];

export const mockCommitteeMembers: CommitteeMember[] = [
  { committeeId: "c1", memberId: "m1", role: "Chair" },
  { committeeId: "c1", memberId: "m12", role: "Member" },
  { committeeId: "c2", memberId: "m3", role: "Member" },
  { committeeId: "c2", memberId: "m4", role: "Secretary" },
  { committeeId: "c3", memberId: "m7", role: "Coordinator" },
  { committeeId: "c3", memberId: "m8", role: "Member" },
];

export const mockRolePermissions: RolePermission[] = [
  { roleId: "r1", permissionId: "p1" },
  { roleId: "r1", permissionId: "p2" },
  { roleId: "r1", permissionId: "p3" },
  { roleId: "r2", permissionId: "p1" },
  { roleId: "r3", permissionId: "p3" },
  { roleId: "r4", permissionId: "p4" },
  { roleId: "r5", permissionId: "p5" },
  { roleId: "r5", permissionId: "p6" },
  { roleId: "r5", permissionId: "p7" },
  { roleId: "r6", permissionId: "p1" },
  { roleId: "r6", permissionId: "p2" },
  { roleId: "r6", permissionId: "p3" },
  { roleId: "r6", permissionId: "p4" },
  { roleId: "r6", permissionId: "p5" },
  { roleId: "r6", permissionId: "p6" },
  { roleId: "r6", permissionId: "p7" },
  { roleId: "r7", permissionId: "p1" },
  { roleId: "r7", permissionId: "p7" },
];

export const mockActivities: Activity[] = [
  { id: "a1", action: "New Member Added", details: "John Smith joined Youth Ministry", time: "2 hours ago", type: "member" },
  { id: "a2", action: "SMS Sent", details: "Announcement sent to Choir (42 recipients)", time: "3 hours ago", type: "sms" },
  { id: "a3", action: "Department Updated", details: "Media Team leader changed to Philip Garcia", time: "5 hours ago", type: "department" },
  { id: "a4", action: "New Member Added", details: "Mary Johnson joined Prayer Team", time: "1 day ago", type: "member" },
  { id: "a5", action: "SMS Sent", details: "Sunday reminder sent to all members", time: "1 day ago", type: "sms" },
  { id: "a6", action: "New Member Added", details: "David Brown joined Ushering", time: "2 days ago", type: "member" },
  { id: "a7", action: "Department Created", details: "New department: Intercessors", time: "3 days ago", type: "department" },
];

export const monthlyMembershipData = [
  { month: "Jan", members: 380, newMembers: 12 },
  { month: "Feb", members: 395, newMembers: 15 },
  { month: "Mar", members: 410, newMembers: 18 },
  { month: "Apr", members: 430, newMembers: 20 },
  { month: "May", members: 455, newMembers: 25 },
  { month: "Jun", members: 470, newMembers: 15 },
  { month: "Jul", members: 490, newMembers: 22 },
  { month: "Aug", members: 510, newMembers: 20 },
  { month: "Sep", members: 525, newMembers: 18 },
  { month: "Oct", members: 535, newMembers: 10 },
  { month: "Nov", members: 540, newMembers: 8 },
  { month: "Dec", members: 542, newMembers: 5 },
];

export const smsActivityData = [
  { month: "Jan", sent: 45, delivered: 42, failed: 3 },
  { month: "Feb", sent: 52, delivered: 48, failed: 4 },
  { month: "Mar", sent: 61, delivered: 58, failed: 3 },
  { month: "Apr", sent: 48, delivered: 45, failed: 3 },
  { month: "May", sent: 55, delivered: 53, failed: 2 },
  { month: "Jun", sent: 70, delivered: 65, failed: 5 },
  { month: "Jul", sent: 63, delivered: 60, failed: 3 },
  { month: "Aug", sent: 58, delivered: 55, failed: 3 },
  { month: "Sep", sent: 72, delivered: 68, failed: 4 },
  { month: "Oct", sent: 66, delivered: 62, failed: 4 },
  { month: "Nov", sent: 80, delivered: 76, failed: 4 },
  { month: "Dec", sent: 90, delivered: 85, failed: 5 },
];

export const departmentDistribution = mockDepartments.map((d) => ({
  name: d.name,
  value: d.membersCount,
}));

export const attendanceData = [
  { month: "Jan", morning: 320, evening: 180 },
  { month: "Feb", morning: 340, evening: 190 },
  { month: "Mar", morning: 360, evening: 200 },
  { month: "Apr", morning: 380, evening: 210 },
  { month: "May", morning: 400, evening: 220 },
  { month: "Jun", morning: 390, evening: 215 },
  { month: "Jul", morning: 410, evening: 230 },
  { month: "Aug", morning: 420, evening: 235 },
  { month: "Sep", morning: 430, evening: 240 },
  { month: "Oct", morning: 440, evening: 245 },
  { month: "Nov", morning: 450, evening: 250 },
  { month: "Dec", morning: 460, evening: 260 },
];

export const genderData = [
  { name: "Male", value: 230 },
  { name: "Female", value: 312 },
];

export const ageGroupData = [
  { group: "0-17", count: 85 },
  { group: "18-25", count: 120 },
  { group: "26-35", count: 145 },
  { group: "36-50", count: 110 },
  { group: "51+", count: 82 },
];
