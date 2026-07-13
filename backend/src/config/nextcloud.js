const axios = require('axios');

const nextcloudClient = axios.create({
  baseURL: process.env.NEXTCLOUD_URL || 'http://192.168.1.4:8080',
  auth: {
    username: process.env.NEXTCLOUD_ADMIN || 'admin',
    password: process.env.NEXTCLOUD_PASSWORD || 'gougoul123'
  },
  headers: {
    'OCS-APIRequest': 'true',
    'Content-Type': 'application/json'
  }
});

// Créer un compte utilisateur dans Nextcloud
const createNextcloudUser = async (username, password, email, displayName) => {
  try {
    const response = await nextcloudClient.post(
      '/ocs/v1.php/cloud/users',
      {
        userid: username,
        password: password,
        email: email,
        displayName: displayName
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Erreur création compte Nextcloud: ${error.message}`);
  }
};

// Ajouter un utilisateur à un groupe
const addUserToGroup = async (username, groupname) => {
  try {
    const response = await nextcloudClient.post(
      `/ocs/v1.php/cloud/users/${username}/groups`,
      { groupid: groupname }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Erreur ajout groupe Nextcloud: ${error.message}`);
  }
};

// Définir le quota d'un utilisateur
const setUserQuota = async (username, quota) => {
  try {
    const response = await nextcloudClient.put(
      `/ocs/v1.php/cloud/users/${username}`,
      { key: 'quota', value: quota }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Erreur quota Nextcloud: ${error.message}`);
  }
};

module.exports = {
  nextcloudClient,
  createNextcloudUser,
  addUserToGroup,
  setUserQuota
};
