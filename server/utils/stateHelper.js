const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh'
};

export const getStateWithCode = (stateName, gstin) => {
  // 1. If GSTIN is provided and valid, use its first 2 digits
  if (gstin && gstin.trim()) {
    const cleanGst = gstin.trim();
    if (cleanGst.length >= 2 && !isNaN(cleanGst.substring(0, 2))) {
      const code = cleanGst.substring(0, 2);
      const matchedState = GST_STATE_CODES[code];
      if (matchedState) {
        return `${code} - ${matchedState}`;
      }
    }
  }

  // 2. If stateName is provided, match it case-insensitively
  if (stateName && stateName.trim()) {
    const trimmed = stateName.trim();
    // Check if it already matches "CODE - STATE" (starts with 2 digits followed by a dash)
    if (/^\d{2}\s*-\s*/.test(trimmed)) {
      return trimmed;
    }

    const cleanName = trimmed.toLowerCase().replace(/[^a-z]/g, '');
    for (const [code, state] of Object.entries(GST_STATE_CODES)) {
      const cleanState = state.toLowerCase().replace(/[^a-z]/g, '');
      if (cleanName === cleanState || cleanName.includes(cleanState) || cleanState.includes(cleanName)) {
        return `${code} - ${state}`;
      }
    }
  }

  return stateName || '';
};
