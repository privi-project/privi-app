import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';
import { GoldGradientText } from '@/components/GoldGradient';
import { LogoutIcon } from '@/components/NavIcons';
import { FloatingModal } from '@/components/FloatingModal';
import { supabase } from '@/services/supabase';
import { useRouter } from 'expo-router';

interface SignOutModalProps {
  visible: boolean;
  onClose: () => void;
}

// Matches "4. SIGN OUT CONFIRMATION MODAL (FLOATING MODAL)" from
// 21_Modal_Pop_Ups_Screens — the pattern the founder said is exactly the
// feel they want for confirmation modals generally (see FloatingModal.tsx).
export function SignOutModal({ visible, onClose }: SignOutModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <FloatingModal
      visible={visible}
      onClose={onClose}
      icon={<LogoutIcon color={COLORS.gold} size={26} />}
      title="Sign Out"
      description="Are you sure you want to sign out of your Privi account?"
    >
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={handleSignOut} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.ivory} /> : <Text style={styles.primaryButtonText}>Sign Out</Text>}
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} style={styles.cancelLink}>
          <GoldGradientText style={styles.cancelText}>Cancel</GoldGradientText>
        </Pressable>
      </View>
    </FloatingModal>
  );
}

const styles = StyleSheet.create({
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.teal,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 14,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
