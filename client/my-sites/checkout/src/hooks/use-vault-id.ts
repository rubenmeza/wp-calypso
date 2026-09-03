import { fetchVgsVaultId } from '@automattic/api-core';
import { useQuery } from '@tanstack/react-query';

export const useVaultId = () => {
	return useQuery( {
		queryKey: [ 'vault-id' ],
		queryFn: fetchVgsVaultId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 3,
	} );
};
