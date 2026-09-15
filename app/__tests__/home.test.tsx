import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import Home from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { FREE_HISTORY_ENTRIES } from '@/logic/limits';
import * as interstitial from '@/monetization/interstitial';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { useCalcStore } from '@/store/useCalcStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const calcInitial = useCalcStore.getState();

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useCalcStore.setState(calcInitial, true);
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
});

describe('Home', () => {
  it('renders the app name and opens settings', async () => {
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    expect(getByText(t('appName'))).toBeTruthy();
    await fireEvent.press(getByLabelText(t('settingsTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/settings');
  });

  it('opens on the BMI calculator', async () => {
    const { getByLabelText } = await renderWithProviders(<Home />);
    expect(getByLabelText(t('tabBmi')).props.accessibilityState.selected).toBe(true);
  });

  it('switches to the GPA calculator', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    await waitFor(() => expect(getByText(t('yourGpa').toUpperCase())).toBeTruthy());
  });
});

describe('BMI', () => {
  it('computes as the fields are filled', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.changeText(getByLabelText(t('heightLabel')), '175');
    await fireEvent.changeText(getByLabelText(t('weightLabel')), '70');
    await waitFor(() => expect(getByText('22.9')).toBeTruthy());
  });

  it('names the WHO band', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.changeText(getByLabelText(t('heightLabel')), '175');
    await fireEvent.changeText(getByLabelText(t('weightLabel')), '70');
    await waitFor(() => expect(getByText(t('bandNormal'))).toBeTruthy());
  });

  it('shows an em dash rather than a number before anything is entered', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText('—')).toBeTruthy();
  });

  it('states the limits of BMI next to the number, not in a settings page', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('bmiDisclaimer'))).toBeTruthy();
  });

  it('converts imperial input correctly', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('unitsImperial')));
    // 5 ft 9 in, 154 lb -> 22.7
    await waitFor(() => expect(getByLabelText(t('feetLabel'))).toBeTruthy());
    await fireEvent.changeText(getByLabelText(t('feetLabel')), '5');
    await fireEvent.changeText(getByLabelText(t('inchesLabel')), '9');
    await fireEvent.changeText(getByLabelText(t('weightLabel')), '154');
    await waitFor(() => expect(getByText('22.7')).toBeTruthy());
  });

  it('saves a measurement into the history', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.changeText(getByLabelText(t('heightLabel')), '175');
    await fireEvent.changeText(getByLabelText(t('weightLabel')), '70');
    await fireEvent.press(getByText(t('saveEntry')));
    expect(useCalcStore.getState().history).toHaveLength(1);
  });

  it('will not save a measurement it cannot compute', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t('saveEntry')));
    expect(useCalcStore.getState().history).toHaveLength(0);
  });

  it('caps the visible history for a free user but keeps the entries', async () => {
    for (let i = 0; i < FREE_HISTORY_ENTRIES + 2; i += 1) {
      useCalcStore.getState().addEntry(175, 70 + i, 1000 + i);
    }
    const { getAllByLabelText, getByText } = await renderWithProviders(<Home />);
    expect(getAllByLabelText(t('deleteEntry'))).toHaveLength(FREE_HISTORY_ENTRIES);
    expect(getByText(t('hiddenEntries', { count: 2 }))).toBeTruthy();
    // Nothing was deleted to enforce the cap.
    expect(useCalcStore.getState().history).toHaveLength(FREE_HISTORY_ENTRIES + 2);
  });

  it('shows a premium user the whole history and no upsell', async () => {
    usePremiumStore.setState({ isPremium: true });
    for (let i = 0; i < FREE_HISTORY_ENTRIES + 2; i += 1) {
      useCalcStore.getState().addEntry(175, 70 + i, 1000 + i);
    }
    const { getAllByLabelText, queryByText } = await renderWithProviders(<Home />);
    expect(getAllByLabelText(t('deleteEntry'))).toHaveLength(FREE_HISTORY_ENTRIES + 2);
    expect(queryByText(t('hiddenEntries', { count: 2 }))).toBeNull();
  });

  it('deletes an entry the user removes', async () => {
    useCalcStore.getState().addEntry(175, 70);
    const { getAllByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getAllByLabelText(t('deleteEntry'))[0]!);
    expect(useCalcStore.getState().history).toHaveLength(0);
  });
});

describe('GPA', () => {
  const addCourses = () => {
    useCalcStore.getState().addCourse({ name: 'Algebra', credits: 4, grade: 'A', semester: '1' });
    useCalcStore.getState().addCourse({ name: 'History', credits: 1, grade: 'C', semester: '1' });
  };

  it('shows the weighted average, not the mean of the grades', async () => {
    addCourses();
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    await waitFor(() => expect(getByText('3.60')).toBeTruthy());
  });

  it('counts the credits', async () => {
    addCourses();
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    await waitFor(() => expect(getByText(t('totalCreditsLabel', { count: 5 }))).toBeTruthy());
  });

  it('says so when there are no courses rather than showing 0.00', async () => {
    const { getByLabelText, getByText, queryByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    await waitFor(() => expect(getByText(t('noCourses'))).toBeTruthy());
    expect(queryByText('0.00')).toBeNull();
  });

  it('opens the course form', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    await fireEvent.press(getByText(t('addCourse')));
    expect(testRouter.push).toHaveBeenCalledWith('/course');
  });

  it('sends a free user to the paywall for the projector', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    await fireEvent.press(getByText(t('projectorTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
  });

  it('opens the projector for a premium user', async () => {
    usePremiumStore.setState({ isPremium: true });
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    await fireEvent.press(getByText(t('projectorTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/projector');
  });
});

describe('ads', () => {
  it('shows a banner to a free user', async () => {
    const { queryByTestId } = await renderWithProviders(<Home />);
    expect(queryByTestId('banner-ad')).not.toBeNull();
  });

  it('shows no banner to a premium user', async () => {
    usePremiumStore.setState({ isPremium: true });
    const { queryByTestId } = await renderWithProviders(<Home />);
    expect(queryByTestId('banner-ad')).toBeNull();
  });

  it('does not interrupt a user who has barely started', async () => {
    const spy = jest.spyOn(interstitial, 'showInterstitial').mockReturnValue(true);
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    expect(spy).not.toHaveBeenCalled();
  });

  it('runs an interstitial on a calculator switch once enough work is done', async () => {
    const spy = jest.spyOn(interstitial, 'showInterstitial').mockReturnValue(true);
    for (let i = 0; i < 3; i += 1) useCalcStore.getState().addEntry(175, 70 + i, 1000 + i);
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    expect(spy).toHaveBeenCalled();
  });

  it('never interrupts a premium user', async () => {
    usePremiumStore.setState({ isPremium: true });
    const spy = jest.spyOn(interstitial, 'showInterstitial').mockReturnValue(true);
    for (let i = 0; i < 9; i += 1) useCalcStore.getState().addEntry(175, 70 + i, 1000 + i);
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('tabGpa')));
    expect(spy).not.toHaveBeenCalled();
  });
});
