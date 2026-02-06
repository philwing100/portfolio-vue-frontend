import { instance as axios } from './axios'; // Import your configured Axios instance
import store from './store'; // Import the Vuex store to access sessionId and other state


// Validate token function (defined once and reused)
function validateToken() {
  const { token } = store.state;
  if (!token) {
    console.log(token);
    throw new Error('No token ID found. User may not be authenticated.');
  }else{
    axios.defaults.headers.common['authorization'] = `${token}`;
  }
}

// Set the default Authorization header for all requests

// API call to create or update the "list object" for a page/date
// BACKEND NOTE:
//   The `data` payload is now a JSON object with the shape:
//   {
//     parent_page: 'dashboard',          // logical owner of the list object
//     date: 'YYYY-MM-DD',                // day these lists belong to
//     lists: [                           // array of lists rendered in the dashboard
//       {
//         title: string,
//         visible: boolean,
//         color: string,
//         items: [                       // each item is the task structure used by DailyCalendar/ListElement
//           {
//             textString: string,
//             scheduledDate: 'YYYY-MM-DD',
//             scheduledTime: 'h:mmam/pm',
//             scheduledStartTime: 'h:mmam/pm',
//             scheduledEndTime: 'h:mmpm',
//             taskTimeEstimate: number,   // minutes
//             recurringTask: boolean,
//             recurringFrequency?: 'daily' | 'weekly' | 'monthly',
//             dueDateCheckbox: boolean,
//             dueDate: string | null,
//             complete: boolean
//           },
//           ...
//         ]
//       },
//       ...
//     ]
//   }
//   The backend should persist this whole structure (e.g. one row per
//   (parent_page, date) with a JSON column containing `lists`).
export async function createList(listData) {
  validateToken();
  
  try {
    const response = await axios.post(
      '/lists/',
      {
        action: 'createList',
        // listData is already a structured object representing the full list object
        data: JSON.stringify(listData),
      }
    );
    return response.data;
  } catch (error) {
    console.warn('Error creating list:', error, ...arguments);
    throw error;
  }
}

// API call to get a list object
// `identifier` can be:
//   - string  -> treated as legacy `list_title`
//   - object  -> treated as a new-style filter, e.g.
//                { parent_page: 'dashboard', date: 'YYYY-MM-DD' }
// BACKEND NOTE:
//   When `params` contains `parent_page` and `date`, the backend should
//   return the full list object in the same shape described above, e.g.:
//   {
//     message: 'Success',
//     data: {
//       parent_page: 'dashboard',
//       date: 'YYYY-MM-DD',
//       lists: [ /* same structure as in createList */ ]
//     }
//   }
//   For legacy callers that only send `list_title`, the existing
//   behaviour (returning a flat array of items) can be preserved.
export async function getList(identifier) {
  validateToken();

  const params =
    typeof identifier === 'object' && identifier !== null
      ? identifier
      : { list_title: identifier };

  try {
    const response = await axios.post(
      '/lists/',
      {
        action: 'getList',
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.warn('Error fetching list:', error, ...arguments);
    throw error;
  }
}

// Generic GET request with token validation
export async function axiosGet(url, params = {}) {
  // Validate token before making the API call
  validateToken();

  try {
    const response = await axios.get(url, {
      params, // Query parameters
    });
    return response.data;
  } catch (error) {
    console.warn('Error with GET request:', error, ...arguments);
    throw error;
  }
}

// Generic POST request with token validation
export async function axiosPost(url, action, data = {}) {
  validateToken();
//console.log(data);
  try {
    const response = await axios.post(
      url,
      {
        action: action,
        data: JSON.stringify(data),
      }
    );
          
    return response.data;
  } catch (error) {
    console.warn('Error with POST request:', error, ...arguments);
    throw error;
  }
}

export async function getStreaks() {
  // Validate token before making the API call
  validateToken();

  try {
    const response = await axios.post(
      '/streaks/',
      {
        action: 'getStreaks',
        params: {},
      }
    );
    return response.data;
  } catch (error) {
    console.warn('Error fetching streaks:', error, ...arguments);
    throw error;
  }
}

export async function updateStreak() {
  validateToken();

  try {
    const response = await axios.post(
      '/streaks/',
      {
        action: 'updateStreak',
        params: {},
      }
    );
    return response.data;
  } catch (error) {
    console.warn('Error updating streak:', error, ...arguments);
    throw error;
  }
}