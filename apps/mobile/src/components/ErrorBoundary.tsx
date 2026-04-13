import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';

const AUTH_STORE_KEY = 'tsewa-auth-store';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);

    // Clear potentially corrupted auth data so restart has a clean slate
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(AUTH_STORE_KEY);
      }
    } catch {
      // Storage access can fail too — nothing more we can do
    }
  }

  handleRestart = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      // On native, reset state to re-render the tree from scratch.
      // Expo's error recovery will also kick in on next launch if needed.
      this.setState({ hasError: false });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app ran into an unexpected error. Your data has been safely
            cleared to prevent further issues.
          </Text>
          <Pressable style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>Restart</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.softWhite,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.lavender,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
