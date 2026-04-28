// Mock for react-native-gesture-handler

// Mock gesture event
interface MockGestureEvent {
  x: number;
  y: number;
  translationX: number;
  translationY: number;
}

// Store callbacks for testing
type GestureCallback = (event: MockGestureEvent) => void;

class MockPanGesture {
  private _enabled = true;
  private _onBegin?: GestureCallback;
  private _onUpdate?: GestureCallback;
  private _onEnd?: GestureCallback;
  private _onFinalize?: GestureCallback;

  enabled(value: boolean) {
    this._enabled = value;
    return this;
  }

  onBegin(callback: GestureCallback) {
    this._onBegin = callback;
    return this;
  }

  onUpdate(callback: GestureCallback) {
    this._onUpdate = callback;
    return this;
  }

  onEnd(callback: GestureCallback) {
    this._onEnd = callback;
    return this;
  }

  onFinalize(callback: GestureCallback) {
    this._onFinalize = callback;
    return this;
  }

  // Test helpers
  simulateBegin(event: MockGestureEvent) {
    if (this._enabled && this._onBegin) {
      this._onBegin(event);
    }
  }

  simulateUpdate(event: MockGestureEvent) {
    if (this._enabled && this._onUpdate) {
      this._onUpdate(event);
    }
  }

  simulateEnd(event: MockGestureEvent) {
    if (this._enabled && this._onEnd) {
      this._onEnd(event);
    }
  }

  simulateFinalize(event: MockGestureEvent) {
    if (this._enabled && this._onFinalize) {
      this._onFinalize(event);
    }
  }

  isEnabled() {
    return this._enabled;
  }
}

class MockTapGesture {
  private _enabled = true;
  private _onEnd?: GestureCallback;

  enabled(value: boolean) {
    this._enabled = value;
    return this;
  }

  onEnd(callback: GestureCallback) {
    this._onEnd = callback;
    return this;
  }

  simulateTap(event: MockGestureEvent) {
    if (this._enabled && this._onEnd) {
      this._onEnd(event);
    }
  }

  isEnabled() {
    return this._enabled;
  }
}

class MockGestureClass {
  static Pan() {
    return new MockPanGesture();
  }

  static Tap() {
    return new MockTapGesture();
  }

  static Simultaneous(...gestures: any[]) {
    return {
      type: 'Simultaneous',
      gestures,
    };
  }
}

export const Gesture = MockGestureClass;
export { MockPanGesture, MockTapGesture };
