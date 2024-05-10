import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

export function PackageInfo () {
    const params = useParams();
    const navigate = useNavigate();
    const { data, error } = useSuiClientQuery('getObject', {
        id: params.id!,
        options: {
            showDisplay: true,
            showContent: true,
            showOwner: true
        }
    });

    useEffect(() => {

        if (data?.error) {
            toast.error(`Failed to find package info ${params.id}: ${data?.error?.code}`);
            navigate('/packages');
        }
    }, [data]);

    return (
        <div>
            <div className="grid lg:grid-cols-3 gap-10">
                {JSON.stringify(data)}
            </div>
        </div>
    )
}
