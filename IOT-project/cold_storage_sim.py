import requests
import random
import time

# 🔁 TODO: PUT YOUR VALUES HERE
CHANNEL_ID = 3165856  # <-- replace with your Channel ID (number)
WRITE_API_KEY = "KZWZ25ON92G6ZV69"  # <-- replace with your actual Write API Key

BASE_URL = "https://api.thingspeak.com/update"

def simulate_temperature(current_temp, fault_mode=False):
    """Simulate temperature with small random variation, and higher values in fault mode."""
    if fault_mode:
        # In fault mode, temperature drifts upwards more
        change = random.uniform(0.1, 0.5)
    else:
        # Normal small ups and downs
        change = random.uniform(-0.3, 0.3)

    new_temp = current_temp + change

    # Clamp normal range roughly between 2 and 12 for realism
    new_temp = max(2.0, min(new_temp, 12.0))
    return round(new_temp, 2)

def simulate_humidity(current_hum):
    """Simulate humidity between 60 and 90%."""
    change = random.uniform(-1.0, 1.0)
    new_hum = current_hum + change
    new_hum = max(60.0, min(new_hum, 90.0))
    return round(new_hum, 2)

def simulate_door_status():
    """0 = closed (most of the time), 1 = open (sometimes)."""
    # 90% chance closed, 10% chance open
    return 1 if random.random() < 0.1 else 0

def send_to_thingspeak(temp, door, hum):
    """Send data to ThingSpeak channel."""
    payload = {
        "api_key": WRITE_API_KEY,
        "field1": temp,    # Temperature_C
        "field2": door,    # DoorStatus
        "field3": hum      # Humidity
    }
    try:
        response = requests.get(BASE_URL, params=payload, timeout=5)
        if response.status_code == 200 and response.text != "0":
            print(f"✅ Sent: Temp={temp}°C, Door={door}, Humidity={hum}% | Entry ID: {response.text}")
        else:
            print(f"⚠️ Failed to update ThingSpeak. Response: {response.text}")
    except Exception as e:
        print("❌ Error sending data:", e)

def main():
    current_temp = 4.0   # starting normal temp
    current_hum = 75.0   # starting humidity
    counter = 0

    print("Starting simulation... Press Ctrl+C to stop.\n")

    while True:
        counter += 1

        # Every ~20 iterations, simulate a fault (high temperature)
        fault_mode = (counter % 20 == 0 or counter % 21 == 0)

        current_temp = simulate_temperature(current_temp, fault_mode=fault_mode)
        current_hum = simulate_humidity(current_hum)
        door_status = simulate_door_status()

        send_to_thingspeak(current_temp, door_status, current_hum)

        # ThingSpeak free tier: minimum 15 seconds between writes
        time.sleep(20)

if __name__ == "__main__":
    main()
