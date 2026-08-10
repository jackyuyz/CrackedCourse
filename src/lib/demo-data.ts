import type { GradeCategory } from "@/lib/grades/calculations";

export interface AppCourse {
  id: string;
  code: string;
  title: string;
  section?: string | null;
  termName: string;
  timeZone: string;
  color: "ocean" | "orange" | "gold" | "navy";
  status: "draft" | "active" | "archived";
  nextEvent?: string | null;
  nextEventDate?: string | null;
  currentGrade?: number | null;
  representedWeight?: number | null;
  unresolvedCount: number;
}

export interface AppEvent {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseColor: AppCourse["color"];
  title: string;
  type:
    | "exam"
    | "quiz"
    | "assignment"
    | "project"
    | "office_hour"
    | "class_session"
    | "deadline"
    | "other";
  date: string;
  displayDate: string;
  time?: string | null;
  isAllDay: boolean;
  location?: string | null;
  sourcePage?: number | null;
}

export const demoCourses: AppCourse[] = [
  {
    id: "course-cs-1522",
    code: "15-122",
    title: "Principles of Imperative Computation",
    section: "Section A",
    termName: "Fall 2026",
    timeZone: "America/New_York",
    color: "ocean",
    status: "active",
    nextEvent: "Written Homework 2",
    nextEventDate: "Sep 9",
    currentGrade: 88.6,
    representedWeight: 32,
    unresolvedCount: 1,
  },
  {
    id: "course-design-210",
    code: "DES 210",
    title: "Communication Design Studio",
    section: "Studio 03",
    termName: "Fall 2026",
    timeZone: "America/New_York",
    color: "orange",
    status: "active",
    nextEvent: "Critique: Systems Study",
    nextEventDate: "Sep 11",
    currentGrade: null,
    representedWeight: null,
    unresolvedCount: 0,
  },
  {
    id: "course-stats-36",
    code: "36-200",
    title: "Reasoning with Data",
    section: "Lecture 1",
    termName: "Fall 2026",
    timeZone: "America/New_York",
    color: "gold",
    status: "active",
    nextEvent: "Problem Set 1",
    nextEventDate: "Sep 14",
    currentGrade: 93.2,
    representedWeight: 15,
    unresolvedCount: 2,
  },
];

export const demoEvents: AppEvent[] = [
  {
    id: "event-1",
    courseId: "course-cs-1522",
    courseCode: "15-122",
    courseTitle: "Principles of Imperative Computation",
    courseColor: "ocean",
    title: "Written Homework 2",
    type: "assignment",
    date: "2026-09-09",
    displayDate: "Wed, Sep 9",
    time: "11:59 PM",
    isAllDay: false,
    sourcePage: 4,
  },
  {
    id: "event-2",
    courseId: "course-design-210",
    courseCode: "DES 210",
    courseTitle: "Communication Design Studio",
    courseColor: "orange",
    title: "Critique: Systems Study",
    type: "project",
    date: "2026-09-11",
    displayDate: "Fri, Sep 11",
    time: "1:30 PM",
    isAllDay: false,
    location: "Margaret Morrison 203",
    sourcePage: 7,
  },
  {
    id: "event-3",
    courseId: "course-stats-36",
    courseCode: "36-200",
    courseTitle: "Reasoning with Data",
    courseColor: "gold",
    title: "Problem Set 1",
    type: "assignment",
    date: "2026-09-14",
    displayDate: "Mon, Sep 14",
    time: "5:00 PM",
    isAllDay: false,
    sourcePage: 3,
  },
  {
    id: "event-4",
    courseId: "course-cs-1522",
    courseCode: "15-122",
    courseTitle: "Principles of Imperative Computation",
    courseColor: "ocean",
    title: "Professor office hours",
    type: "office_hour",
    date: "2026-09-15",
    displayDate: "Tue, Sep 15",
    time: "2:00 PM",
    isAllDay: false,
    location: "Gates 6203",
    sourcePage: 1,
  },
  {
    id: "event-5",
    courseId: "course-cs-1522",
    courseCode: "15-122",
    courseTitle: "Principles of Imperative Computation",
    courseColor: "ocean",
    title: "Midterm 1",
    type: "exam",
    date: "2026-09-24",
    displayDate: "Thu, Sep 24",
    time: "7:00 PM",
    isAllDay: false,
    location: "DH 2210",
    sourcePage: 5,
  },
  {
    id: "event-6",
    courseId: "course-design-210",
    courseCode: "DES 210",
    courseTitle: "Communication Design Studio",
    courseColor: "orange",
    title: "Process book checkpoint",
    type: "deadline",
    date: "2026-09-28",
    displayDate: "Mon, Sep 28",
    time: null,
    isAllDay: true,
    sourcePage: 8,
  },
  {
    id: "event-7",
    courseId: "course-stats-36",
    courseCode: "36-200",
    courseTitle: "Reasoning with Data",
    courseColor: "gold",
    title: "Quiz 1",
    type: "quiz",
    date: "2026-10-02",
    displayDate: "Fri, Oct 2",
    time: "10:00 AM",
    isAllDay: false,
    sourcePage: 4,
  },
];

export const demoGradeCategories: GradeCategory[] = [
  {
    name: "Written homework",
    weightPercent: 20,
    scorePercent: 90,
  },
  {
    name: "Programming assignments",
    weightPercent: 35,
    scorePercent: 82,
  },
  {
    name: "Midterms",
    weightPercent: 25,
    scorePercent: null,
  },
  {
    name: "Final exam",
    weightPercent: 20,
    scorePercent: null,
  },
];

export const demoPeople = [
  {
    name: "Dr. Lena Ortiz",
    role: "Instructor",
    email: "lortiz@example.edu",
    office: "Gates 6203",
    officeHours: "Tuesdays, 2:00–3:30 PM",
  },
  {
    name: "Noah Kim",
    role: "Teaching assistant",
    email: "nkim@example.edu",
    office: "Gates 4101",
    officeHours: "Thursdays, 4:00–5:00 PM",
  },
];
