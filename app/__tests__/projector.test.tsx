import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import Projector from '../projector';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { useCalcStore } from '@/store/useCalcStore';

const initial = useCalcStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useCalcStore.setState(initial, true);
  // 3.0 over 30 credits.
  useCalcStore.getState().addCourse({ name: 'A', credits: 30, grade: 'B', semester: '1' });
});

describe('Projector', () => {
  it('shows the current average and credits', async () => {
    const { getByText } = await renderWithProviders(<Projector />);
    expect(getByText('3.00')).toBeTruthy();
    expect(getByText(t('totalCreditsLabel', { count: 30 }))).toBeTruthy();
  });

  it('says what the remaining credits must average', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Projector />);
    await fireEvent.changeText(getByLabelText(t('remainingCredits')), '30');
    await waitFor(() => expect(getByText(t('needAverage', { average: '4.00' }))).toBeTruthy());
  });

  it('says plainly when a target cannot be reached, rather than printing an impossible grade', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Projector />);
    await fireEvent.changeText(getByLabelText(t('targetGpa')), '3.9');
    await fireEvent.changeText(getByLabelText(t('remainingCredits')), '6');
    await waitFor(() => expect(getByText(t('unreachableTarget'))).toBeTruthy());
  });

  it('says the target is already met when it is', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Projector />);
    await fireEvent.changeText(getByLabelText(t('targetGpa')), '2.5');
    await fireEvent.changeText(getByLabelText(t('remainingCredits')), '10');
    await waitFor(() => expect(getByText(t('alreadyReached'))).toBeTruthy());
  });

  it('shows nothing rather than a guess for a target above the scale', async () => {
    const { getByLabelText, queryByText } = await renderWithProviders(<Projector />);
    await fireEvent.changeText(getByLabelText(t('targetGpa')), '9');
    await fireEvent.changeText(getByLabelText(t('remainingCredits')), '30');
    await waitFor(() => expect(queryByText(t('unreachableTarget'))).toBeNull());
    expect(queryByText(t('alreadyReached'))).toBeNull();
  });
});
