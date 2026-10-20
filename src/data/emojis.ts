// Emoji pages for the in-app picker. iPad Safari can't be told to open its
// emoji keyboard, so the forms offer these instead of relying on the OS.
export const EMOJI_PAGES: { id: string; icon: string; label: string; emojis: string }[] = [
  {
    id: 'travel', icon: '✈️', label: 'Travel & places',
    emojis: '✈️ 🛫 🛬 🚆 🚄 🚇 🚊 🚌 🚐 🚕 🚗 🛻 🚙 🏍️ 🛵 🚲 🛴 ⛴️ 🚢 🛳️ ⛵ 🚤 🛶 🚁 🚡 🚠 🚞 🗺️ 🧭 🧳 🎒 🏨 🏩 🏠 🏡 🏘️ ⛺ 🏕️ 🏖️ 🏝️ 🏜️ 🏔️ ⛰️ 🌋 🗻 🏞️ 🏟️ 🏛️ 🏰 🏯 🗼 🗽 🗿 ⛩️ 🛕 🕌 ⛪ 🕍 🌉 🌁 🌃 🏙️ 🌆 🌇 🎡 🎢 🎠 ⛲ 🗾 🌏 🌍 🌎 🛂 🛃 🛄 ⛽ 🚏 🚦',
  },
  {
    id: 'food', icon: '🍜', label: 'Food & drink',
    emojis: '🍜 🍣 🍱 🍙 🍘 🍥 🍤 🥟 🥠 🍢 🍡 🍚 🍛 🍲 🥘 🍝 🍕 🍔 🌭 🥪 🌮 🌯 🥙 🧆 🥗 🥩 🍖 🍗 🥓 🍳 🥞 🧇 🥐 🥖 🥨 🥯 🧀 🍞 🦪 🦞 🦀 🦐 🐟 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍎 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 ☕ 🍵 🧋 🧃 🥤 🍶 🍺 🍻 🍷 🥂 🍸 🍹 🥃 🧉',
  },
  {
    id: 'activities', icon: '🎭', label: 'Activities',
    emojis: '🎭 🎨 🖼️ 🎬 🎤 🎧 🎼 🎹 🎸 🎻 🎷 🎺 🥁 🎟️ 🎫 🎪 🎳 🎮 🎲 🧩 ♟️ 🎯 🎰 🛍️ 💆 💅 💇 🧖 🏊 🏄 🚣 🤿 🧗 🚴 🚵 🏇 ⛷️ 🏂 🏌️ 🥾 🎣 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🏸 ⛳ 🥊 🥋 🛹 ⛸️ 🎿 🛷 🧘 🤸 🏋️ 🎉 🎊 🎈 🎁 🎆 🎇 🏮 🎐 🎏 🎑 🎃 🎄 🎋 📸 🔭',
  },
  {
    id: 'nature', icon: '🌸', label: 'Nature & weather',
    emojis: '🌸 💮 🏵️ 🌹 🌺 🌻 🌼 🌷 💐 🌱 🪴 🌲 🌳 🌴 🌵 🎍 🍀 🍁 🍂 🍃 🌾 🍄 🐚 🪨 🌊 💧 🔥 ⛄ ❄️ ☃️ 🌨️ 🌧️ ⛈️ 🌩️ 🌦️ 🌥️ ⛅ 🌤️ ☀️ 🌞 🌝 🌛 🌙 ⭐ 🌟 ✨ 💫 ☄️ 🌈 ☂️ ☔ 🌪️ 🌫️ 🌅 🌄 🌌 🌠',
  },
  {
    id: 'animals', icon: '🐼', label: 'Animals',
    emojis: '🐼 🐨 🐯 🦁 🐘 🦒 🦓 🦏 🦛 🐪 🐫 🦘 🐒 🦍 🦧 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐻‍❄️ 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦩 🦜 🦚 🐢 🐍 🦎 🐊 🦕 🦖 🐳 🐋 🐬 🦭 🐠 🐡 🦈 🐙 🦑 🪼 🦋 🐝 🐞 🦀 🐌 🦌 🐎 🦙 🐐 🐑 🐄 🐖 🐿️ 🦔 🦦 🦥',
  },
  {
    id: 'smileys', icon: '😀', label: 'Smileys & people',
    emojis: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😎 🥳 🤓 🧐 🤔 🤗 🤭 😴 🥱 😌 😮‍💨 🥵 🥶 🤯 😱 😭 🥹 😤 🤠 🥸 😈 👻 👽 🤖 💩 👋 👍 👏 🙌 🙏 💪 🤝 ✌️ 🤞 🫶 ❤️ 🧡 💛 💚 💙 💜 🤍 💖 💯 👫 👪 👶 🧒 🧑 👵 🧓 🚶 🏃 💃 🕺',
  },
  {
    id: 'objects', icon: '📌', label: 'Objects & symbols',
    emojis: '📌 📍 🚩 🏁 🔖 🏷️ 💡 🔑 🗝️ 🔒 📷 📸 🎥 📱 💻 🔋 🔌 🧴 🧼 🪥 🧻 👓 🕶️ 🧢 👒 🎩 👕 👗 👙 🩱 🩴 👟 🥿 👜 👛 💼 ☂️ 💳 💵 💴 💶 💷 🪙 🛒 📚 📖 📝 ✏️ 🗒️ 📅 🗓️ ⏰ ⌛ 🧾 ✉️ 📦 🎁 🏥 💊 🩹 ⚕️ ℹ️ ✅ ❌ ⚠️ ⭐ ❤️ 💤 🆓 🔝 🆕 🅿️ 🚻 🚾 ♨️ 💈',
  },
  {
    id: 'flags', icon: '🏳️', label: 'Flags',
    emojis: '🇯🇵 🇻🇳 🇹🇭 🇰🇷 🇨🇳 🇹🇼 🇭🇰 🇸🇬 🇲🇾 🇮🇩 🇵🇭 🇰🇭 🇱🇦 🇮🇳 🇳🇵 🇱🇰 🇦🇺 🇳🇿 🇺🇸 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇨🇱 🇵🇪 🇨🇴 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇮🇸 🇬🇧 🇮🇪 🇫🇷 🇩🇪 🇳🇱 🇧🇪 🇨🇭 🇦🇹 🇮🇹 🇪🇸 🇵🇹 🇬🇷 🇭🇷 🇨🇿 🇵🇱 🇭🇺 🇹🇷 🇪🇬 🇲🇦 🇿🇦 🇰🇪 🇹🇿 🇦🇪 🇮🇱 🇯🇴 🇪🇺 🏳️ 🏴 🏳️‍🌈 🏴‍☠️',
  },
]
