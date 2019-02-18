/**
 * @file apiConfig.ts
 * @fileoverview - Exports an object literal with configuration information for
 *    the available OCAPI calls.
 */

export const apiConfig = {
  clientId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  clientPassword: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  resources: {

    /**
     * OCAPI : Data API
     * Resource : SystemObjectDefinitions
     */
    systemObjectDefinitions: {
      api: 'data',
      availableCalls: {
        // Gets a single system object definition.
        get: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'GET',
          params: [
            {
              id: 'objectType',
              type: 'string',
              use: 'PATH_PARAMETER'
            }
          ],
          path: 'system_object_definitions/{objectType}'
        },

        // Get a list of the system object definitions filtered by the included
        // query parameters.
        getAll: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'GET',
          params: [
            {
              id: 'select',
              type: 'string',
              use: 'QUERY_PARAMETER'
            }, {
              id: 'count',
              type: 'number',
              use: 'QUERY_PARAMETER'
            }
          ],
          path: 'system_object_definitions',
        },

        // Get a list of the system object attributes for the specified system
        // object type.
        getAttributes: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'GET',
          params: [
            {
              id: 'select',
              type: 'string',
              use: 'QUERY_PARAMETER'
            },{
              id: 'objectType',
              type: 'string',
              use: 'PATH_PARAMETER'
            }
          ],
          path: 'system_object_definitions/{objectType}/attribute_definitions'
        },

        // Create a new attribute definition.
        createAttribute: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json',
            'x-dw-validate-existing': true,
            'Accept': 'application/json'
          },
          method: 'PUT',
          params: [
            {
              id: 'id',
              type: 'string',
              use: 'PATH_PARAMETER'
            },{
              id: 'objectType',
              type: 'string',
              use: 'PATH_PARAMETER'
            }

          ],
          path: 'system_object_definitions/{objectType}/attribute_definitions/{id}'
        },

        // Get a list of the system object attributes for the specified system
        // object type.
        deleteAttribute: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json',
            'x-dw-validate-existing': true,
            'Accept': 'application/json'
          },
          method: 'DELETE',
          params: [
            {
              id: 'id',
              type: 'string',
              use: 'PATH_PARAMETER'
            },{
              id: 'objectType',
              type: 'string',
              use: 'PATH_PARAMETER'
            }

          ],
          path: 'system_object_definitions/{objectType}/attribute_definitions/{id}'
        },

        // Create an attribute group for a specified system object definition.
        createAttributeGroup: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json',
            'x-dw-validate-existing': true,
            'Accept': 'application/json'
          },
          method: 'PUT',
          params: [
            {
              id: 'id',
              type: 'string',
              use: 'PATH_PARAMETER'
            },{
              id: 'objectType',
              type: 'string',
              use: 'PATH_PARAMETER'
            }

          ],
          path: 'system_object_definitions/{objectType}/attribute_groups/{id}'
        },

        // Get the attribute groups
        getAttributeGroups: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'GET',
          params: [
            {
              id: 'select',
              type: 'string',
              use: 'QUERY_PARAMETER'
            },{
              id: 'objectType',
              type: 'string',
              use: 'PATH_PARAMETER'
            }
          ],
          path: 'system_object_definitions/{objectType}/attribute_groups'
        },

        // Assign attribute to attribute group.
        assignAttributeToGroup: {
          authorization: 'BM_USER',
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'PUT',
          params: [
            {
              id: 'objectType',
              type: 'string',
              use: 'PATH_PARAMETER'
            }, {
              id: 'groupId',
              type: 'string',
              use: 'PATH_PARAMETER'
            }, {
              id: 'attributeId',
              type: 'string',
              use: 'PATH_PARAMETER'
            }
          ],
          path: 'system_object_definitions/{objectType}/attribute_groups/{groupId}/attribute_definitions/{attributeId}'
        }
      }
    }
  },

  /*
   * -- Target API Version ---
   * This should be the same as the version number for wich the client ID access
   * assigned in your sandboxes OCAPI Configuration and should be in the same
   * format as it is in an OCAPI URL (i.e.: v18_8).
   */
  version: 'v18_8'
};
