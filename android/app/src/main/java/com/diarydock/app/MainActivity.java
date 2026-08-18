package com.diarydock.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DiaryDockShareImportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
