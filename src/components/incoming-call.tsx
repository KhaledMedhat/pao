import React from 'react';
import { Card, CardContent } from './ui/card';
import { PhoneCall, Video, X } from 'lucide-react';
import { Button } from './ui/button';
import { CallType, IncomingCall } from '~/interfaces/call.interface';
import { useCall } from '~/hooks/use-call';
import AnimatedRingingAvatar from './animated-ringing-avatar';

const IncomingCallModal: React.FC<{ incomingCall: IncomingCall | null }> = ({ incomingCall }) => {
    const { rejectCall, acceptCall } = useCall();
    if (!incomingCall) {
        return null;
    }
    return (
        <div className='fixed inset-0 z-50 bg-black/70 flex items-center justify-center'>
            <Card className="w-80 border-0 bg-main-primary">
                <CardContent className="p-6">
                    <div className="text-center flex flex-col items-center space-y-8">
                        <AnimatedRingingAvatar profilePicture={incomingCall?.caller.profilePicture} profilePictureBannerColor={incomingCall?.caller.profilePictureBannerColor} displayName={incomingCall?.caller.displayName} />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">{incomingCall?.caller.displayName}</h3>
                            <p className="text-lg text-foreground">Incoming <span className='capitalize'>{incomingCall?.callType}</span> Call...</p>
                        </div>
                        <div className="flex justify-center space-x-4">
                            <Button variant="destructive" size="lg" onClick={rejectCall} className='p-6 rounded-xl'>
                                <X size={24} />
                            </Button>
                            <Button variant="default" size="lg" onClick={acceptCall} className="bg-success hover:bg-success/80 p-6 rounded-xl">
                                {incomingCall?.callType === CallType.Video ? <Video size={24} fill={'var(--foreground)'} /> : <PhoneCall size={24} fill={'var(--foreground)'} />}
                            </Button>


                        </div>
                    </div>
                </CardContent>
            </Card >
        </div>

    );
};

export default IncomingCallModal;