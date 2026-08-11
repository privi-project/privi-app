import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Easing } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export interface ActionSheetItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
}

// Same bottom-sheet mechanics as FilterModal (slide up/down, 350ms in /
// 250ms out) — kept as a separate generic component since this one is a
// simple list of tap actions (Location Options, Business Preview) rather
// than a form.
export function ActionSheet({ visible, onClose, title, items }: ActionSheetProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.45, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: 400,
      duration: 250,
      easing: Easing.bezier(0.45, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleItemPress = (item: ActionSheetItem) => {
    Animated.timing(translateY, {
      toValue: 400,
      duration: 250,
      easing: Easing.bezier(0.45, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      onClose();
      item.onPress();
    });
  };

  const bg = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />

          {title ? <Text style={[styles.title, { color: textColor }]}>{title}</Text> : null}

          {items.map((item) => (
            <Pressable key={item.key} style={styles.row} onPress={() => handleItemPress(item)}>
              <View style={styles.rowIcon}>{item.icon}</View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: textColor }]}>{item.label}</Text>
                {item.sublabel ? (
                  <Text style={[styles.rowSublabel, { color: subColor }]}>{item.sublabel}</Text>
                ) : null}
              </View>
            </Pressable>
          ))}

          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={[styles.cancelText, { color: textColor }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.25)',
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
