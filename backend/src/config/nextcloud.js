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

// Supprimer un compte utilisateur Nextcloud (rollback register, B0) — best
// effort : n'importe pas si le compte n'existe pas déjà (ex. l'appelant
// avait déjà échoué avant la création), l'appelant ignore cette erreur.
const deleteNextcloudUser = async (username) => {
  const response = await nextcloudClient.delete(`/ocs/v1.php/cloud/users/${username}`);
  return response.data;
};

// Changer le mot de passe Nextcloud d'un utilisateur (OCS, client admin)
const setUserPassword = async (username, password) => {
  try {
    const response = await nextcloudClient.put(
      `/ocs/v1.php/cloud/users/${username}`,
      { key: 'password', value: password }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Erreur changement mot de passe Nextcloud: ${error.message}`);
  }
};

module.exports = {
  nextcloudClient,
  createNextcloudUser,
  deleteNextcloudUser,
  addUserToGroup,
  setUserQuota,
  setUserPassword
};
