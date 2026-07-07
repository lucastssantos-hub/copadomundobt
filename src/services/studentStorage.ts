import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student, ClassGroup, Assessment } from '../types/students';

const STUDENTS_KEY = '@bt_vision_students';
const GROUPS_KEY = '@bt_vision_groups';
const ASSESSMENTS_KEY = '@bt_vision_assessments';

async function readList<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as T[];
  } catch (err) {
    console.warn(`[studentStorage] read ${key} failed:`, err);
    return [];
  }
}

async function writeList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    const copy = [...list];
    copy[idx] = item;
    return copy;
  }
  return [item, ...list];
}

export const studentStorage = {
  async getStudents(): Promise<Student[]> {
    return readList<Student>(STUDENTS_KEY);
  },

  async saveStudent(student: Student): Promise<void> {
    const students = await this.getStudents();
    await writeList(STUDENTS_KEY, upsert(students, student));
  },

  async deleteStudent(id: string): Promise<void> {
    const students = await this.getStudents();
    await writeList(STUDENTS_KEY, students.filter(s => s.id !== id));

    // Remove o aluno das turmas e apaga suas avaliações
    const groups = await this.getGroups();
    const touched = groups.map(g =>
      g.studentIds.includes(id)
        ? { ...g, studentIds: g.studentIds.filter(sid => sid !== id), updatedAt: new Date().toISOString() }
        : g
    );
    await writeList(GROUPS_KEY, touched);

    const assessments = await this.getAssessments();
    await writeList(ASSESSMENTS_KEY, assessments.filter(a => a.studentId !== id));
  },

  async getGroups(): Promise<ClassGroup[]> {
    return readList<ClassGroup>(GROUPS_KEY);
  },

  async saveGroup(group: ClassGroup): Promise<void> {
    const groups = await this.getGroups();
    await writeList(GROUPS_KEY, upsert(groups, group));
  },

  async deleteGroup(id: string): Promise<void> {
    const groups = await this.getGroups();
    await writeList(GROUPS_KEY, groups.filter(g => g.id !== id));
  },

  async getAssessments(): Promise<Assessment[]> {
    return readList<Assessment>(ASSESSMENTS_KEY);
  },

  async saveAssessment(assessment: Assessment): Promise<void> {
    const assessments = await this.getAssessments();
    await writeList(ASSESSMENTS_KEY, upsert(assessments, assessment));
  },

  async deleteAssessment(id: string): Promise<void> {
    const assessments = await this.getAssessments();
    await writeList(ASSESSMENTS_KEY, assessments.filter(a => a.id !== id));
  },
};
