import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import React from 'react';

import CourseForm from '../course';
import { setRouteParams, testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { useCalcStore } from '@/store/useCalcStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const initial = useCalcStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useCalcStore.setState(initial, true);
  usePremiumStore.setState({ isPremium: false, isReady: true });
  setRouteParams({});
});

const fill = async (ui: ReturnType<typeof renderWithProviders> extends Promise<infer R> ? R : never) => {
  await fireEvent.changeText(ui.getByLabelText(t('courseName')), 'Algebra');
  await fireEvent.changeText(ui.getByLabelText(t('creditsLabel')), '3');
};

describe('adding a course', () => {
  it('will not save until the form is usable', async () => {
    const ui = await renderWithProviders(<CourseForm />);
    await fireEvent.press(ui.getByText(t('addLabel')));
    expect(useCalcStore.getState().courses).toHaveLength(0);
  });

  it('saves a complete course', async () => {
    const ui = await renderWithProviders(<CourseForm />);
    await fill(ui);
    await fireEvent.press(ui.getByText(t('addLabel')));
    const [course] = useCalcStore.getState().courses;
    expect(course).toMatchObject({ name: 'Algebra', credits: 3, grade: 'A' });
    expect(testRouter.back).toHaveBeenCalled();
  });

  it('refuses a credit value that is not a positive number', async () => {
    const ui = await renderWithProviders(<CourseForm />);
    await fireEvent.changeText(ui.getByLabelText(t('courseName')), 'Algebra');
    await fireEvent.changeText(ui.getByLabelText(t('creditsLabel')), '0');
    await fireEvent.press(ui.getByText(t('addLabel')));
    expect(useCalcStore.getState().courses).toHaveLength(0);
  });

  it('lets the grade be picked from the letter scale', async () => {
    const ui = await renderWithProviders(<CourseForm />);
    await fill(ui);
    await fireEvent.press(ui.getByLabelText('B+'));
    await fireEvent.press(ui.getByText(t('addLabel')));
    expect(useCalcStore.getState().courses[0]!.grade).toBe('B+');
  });

  it('accepts a percentage when that scale is chosen', async () => {
    useCalcStore.setState({ scale: 'percent' });
    const ui = await renderWithProviders(<CourseForm />);
    await fireEvent.changeText(ui.getByLabelText(t('courseName')), 'Algebra');
    await fireEvent.changeText(ui.getByLabelText(t('creditsLabel')), '3');
    await fireEvent.changeText(ui.getByLabelText(t('gradeLabel')), '88');
    await fireEvent.press(ui.getByText(t('addLabel')));
    expect(useCalcStore.getState().courses[0]!.grade).toBe('88');
  });
});

describe('editing a course', () => {
  it('opens with the existing values and updates rather than duplicating', async () => {
    const created = useCalcStore.getState().addCourse({
      name: 'History', credits: 2, grade: 'B', semester: '1',
    });
    setRouteParams({ id: created.id });
    const ui = await renderWithProviders(<CourseForm />);
    expect(ui.getByLabelText(t('courseName')).props.value).toBe('History');
    await fireEvent.press(ui.getByLabelText('A'));
    await fireEvent.press(ui.getByText(t('addLabel')));
    const courses = useCalcStore.getState().courses;
    expect(courses).toHaveLength(1);
    expect(courses[0]!.grade).toBe('A');
  });
});

describe('the semester cap', () => {
  it('lets a free user keep adding to the semester they already have', async () => {
    useCalcStore.getState().addCourse({ name: 'First', credits: 3, grade: 'A', semester: '1' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const ui = await renderWithProviders(<CourseForm />);
    await fill(ui);
    await fireEvent.press(ui.getByText(t('addLabel')));
    expect(alert).not.toHaveBeenCalled();
    expect(useCalcStore.getState().courses).toHaveLength(2);
  });

  it('offers the upgrade when a free user starts a second semester', async () => {
    useCalcStore.getState().addCourse({ name: 'First', credits: 3, grade: 'A', semester: '1' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const ui = await renderWithProviders(<CourseForm />);
    await fill(ui);
    await fireEvent.changeText(ui.getByLabelText(t('semesterLabel')), '2');
    await fireEvent.press(ui.getByText(t('addLabel')));
    expect(alert).toHaveBeenCalledWith(t('semesterLimitTitle'), t('semesterLimitBody'), expect.any(Array));
    expect(useCalcStore.getState().courses).toHaveLength(1);
  });

  it('lets a premium user open as many semesters as they like', async () => {
    usePremiumStore.setState({ isPremium: true });
    useCalcStore.getState().addCourse({ name: 'First', credits: 3, grade: 'A', semester: '1' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const ui = await renderWithProviders(<CourseForm />);
    await fill(ui);
    await fireEvent.changeText(ui.getByLabelText(t('semesterLabel')), '2');
    await fireEvent.press(ui.getByText(t('addLabel')));
    expect(alert).not.toHaveBeenCalled();
    expect(useCalcStore.getState().courses).toHaveLength(2);
  });

  it('closes on the close control without saving', async () => {
    const ui = await renderWithProviders(<CourseForm />);
    await fill(ui);
    await fireEvent.press(ui.getByLabelText(t('close')));
    expect(useCalcStore.getState().courses).toHaveLength(0);
    expect(testRouter.back).toHaveBeenCalled();
  });
});
