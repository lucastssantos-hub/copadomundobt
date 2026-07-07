import { create } from 'zustand';
import { Student, ClassGroup, Assessment } from '../types/students';
import { studentStorage } from '../services/studentStorage';
import { generateId as uuidv4 } from '../utils/uuid';

interface StudentState {
  students: Student[];
  groups: ClassGroup[];
  assessments: Assessment[];
  isLoading: boolean;

  loadAll: () => Promise<void>;
  saveStudent: (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
  saveGroup: (data: Omit<ClassGroup, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<ClassGroup>;
  deleteGroup: (id: string) => Promise<void>;
  addAssessment: (data: Omit<Assessment, 'id'>) => Promise<Assessment>;
  deleteAssessment: (id: string) => Promise<void>;

  assessmentsForStudent: (studentId: string) => Assessment[];
  assessmentsByStudent: (studentIds: string[]) => Map<string, Assessment[]>;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  groups: [],
  assessments: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [students, groups, assessments] = await Promise.all([
        studentStorage.getStudents(),
        studentStorage.getGroups(),
        studentStorage.getAssessments(),
      ]);
      set({ students, groups, assessments });
    } finally {
      set({ isLoading: false });
    }
  },

  saveStudent: async (data, id) => {
    const now = new Date().toISOString();
    const existing = id ? get().students.find(s => s.id === id) : undefined;
    const student: Student = {
      ...data,
      id: id ?? uuidv4(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await studentStorage.saveStudent(student);
    await get().loadAll();
    return student;
  },

  deleteStudent: async (id) => {
    await studentStorage.deleteStudent(id);
    await get().loadAll();
  },

  saveGroup: async (data, id) => {
    const now = new Date().toISOString();
    const existing = id ? get().groups.find(g => g.id === id) : undefined;
    const group: ClassGroup = {
      ...data,
      id: id ?? uuidv4(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await studentStorage.saveGroup(group);
    await get().loadAll();
    return group;
  },

  deleteGroup: async (id) => {
    await studentStorage.deleteGroup(id);
    await get().loadAll();
  },

  addAssessment: async (data) => {
    const assessment: Assessment = { ...data, id: uuidv4() };
    await studentStorage.saveAssessment(assessment);
    await get().loadAll();
    return assessment;
  },

  deleteAssessment: async (id) => {
    await studentStorage.deleteAssessment(id);
    await get().loadAll();
  },

  assessmentsForStudent: (studentId) =>
    get().assessments.filter(a => a.studentId === studentId),

  assessmentsByStudent: (studentIds) => {
    const map = new Map<string, Assessment[]>();
    for (const id of studentIds) map.set(id, []);
    for (const a of get().assessments) {
      if (map.has(a.studentId)) map.get(a.studentId)!.push(a);
    }
    return map;
  },
}));
